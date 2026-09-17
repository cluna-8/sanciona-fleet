/**
 * Flujo completo contra un `fetch` simulado: ni un byte sale a la red.
 * Lo que se comprueba es que el contrato se respeta y que un fallo del
 * proveedor se traduce a ErrorIA con el código correcto.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { ErrorIA } from "../src/errores";
import { crearProveedor, crearProveedorDesdeEntorno } from "../src/index";

const fetchReal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchReal; });

function simularGoogle(cuerpo: unknown, status = 200) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(cuerpo), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function respuestaGemini(texto: string) {
  return { candidates: [{ content: { parts: [{ text: texto }] } }], modelVersion: "gemini-test" };
}

const config = {
  proveedor: "google" as const,
  apiKey: "clave-de-prueba",
  modeloExtraccion: "gemini-test",
  modeloAnalisis: "gemini-test",
};

describe("selección de proveedor", () => {
  it("crea cada proveedor soportado", () => {
    expect(crearProveedor({ ...config, proveedor: "google" }).nombre).toBe("google");
    expect(crearProveedor({ ...config, proveedor: "anthropic" }).nombre).toBe("anthropic");
    expect(crearProveedor({ ...config, proveedor: "openai" }).nombre).toBe("openai");
  });

  it("exige API key", () => {
    expect(() => crearProveedor({ ...config, apiKey: "" })).toThrow(ErrorIA);
  });

  it("desde el entorno, sin IA_API_KEY falla con no_autorizado", () => {
    try {
      crearProveedorDesdeEntorno({ IA_PROVEEDOR: "google" });
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("no_autorizado");
    }
  });

  it("rechaza un proveedor no soportado en vez de caer en uno por defecto", () => {
    expect(() =>
      crearProveedorDesdeEntorno({ IA_PROVEEDOR: "deepseek", IA_API_KEY: "k" }),
    ).toThrow(ErrorIA);
  });

  it("google es el proveedor por defecto", () => {
    expect(crearProveedorDesdeEntorno({ IA_API_KEY: "k" }).nombre).toBe("google");
  });
});

describe("extraer()", () => {
  const documento = {
    nombre: "multa.pdf",
    mime: "application/pdf",
    contenido: new TextEncoder().encode("%PDF-1.4 contenido").buffer as ArrayBuffer,
  };

  it("devuelve campos normalizados y el modelo usado", async () => {
    simularGoogle(
      respuestaGemini(
        JSON.stringify({
          texto_documento: "BOLETÍN DE DENUNCIA",
          ocr_utilizado: true,
          campos: {
            matricula: { valor: "1234 KLM", confianza: "Alto", fuente: "1234 KLM" },
            basura: { valor: "x", confianza: "Alto" },
          },
          avisos: ["Sin fecha de notificación"],
        }),
      ),
    );

    const r = await crearProveedor(config).extraer({ documento });
    expect(r.campos["matricula"]?.valor).toBe("1234 KLM");
    expect(r.campos["basura"]).toBeUndefined();
    expect(r.ocr_utilizado).toBe(true);
    expect(r.avisos).toEqual(["Sin fecha de notificación"]);
    expect(r.modelo).toBe("gemini-test");
  });

  it("rechaza un documento vacío antes de gastar una llamada", async () => {
    let llamado = false;
    globalThis.fetch = (async () => { llamado = true; return new Response("{}"); }) as unknown as typeof fetch;
    const vacio = { nombre: "x.pdf", mime: "application/pdf", contenido: new ArrayBuffer(0) };
    await expect(crearProveedor(config).extraer({ documento: vacio })).rejects.toThrow(ErrorIA);
    expect(llamado).toBe(false);
  });

  it("traduce un 402 del proveedor a sin_credito", async () => {
    simularGoogle({ error: "quota" }, 402);
    try {
      await crearProveedor(config).extraer({ documento });
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("sin_credito");
    }
  });
});

describe("analizar()", () => {
  it("aplica los fallbacks si el modelo devuelve un análisis incompleto", async () => {
    simularGoogle(respuestaGemini(JSON.stringify({ motivo: "Faltan datos" })));
    const r = await crearProveedor(config).analizar({ contexto: {}, fuentes: [] });
    expect(r.semaforo).toBe("Gris");
    expect(r.recomendacion).toBe("Revisar");
    expect(r.motivo).toBe("Faltan datos");
  });

  it("inyecta las fuentes verificadas en el prompt", async () => {
    let cuerpoEnviado = "";
    globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
      cuerpoEnviado = String(init.body);
      return new Response(JSON.stringify(respuestaGemini("{}")));
    }) as unknown as typeof fetch;

    await crearProveedor(config).analizar({
      contexto: { expediente: "EXP-1" },
      fuentes: [{ norm: "Ley 39/2015", article: "Artículo 30", official_url: "https://boe.es/x" }],
    });

    expect(cuerpoEnviado).toContain("FUENTES VERIFICADAS");
    expect(cuerpoEnviado).toContain("Ley 39/2015");
    expect(cuerpoEnviado).toContain("EXP-1");
  });
});

describe("redactar()", () => {
  it("devuelve el escrito en texto plano, sin parsear JSON", async () => {
    simularGoogle(respuestaGemini("ORGANISMO DESTINATARIO\n\nHECHOS\nPrimero.-"));
    const r = await crearProveedor(config).redactar({
      tipo: "Alegaciones", contexto: {}, fuentes: [],
    });
    expect(r.contenido).toContain("ORGANISMO DESTINATARIO");
  });

  it("falla si el modelo devuelve un escrito vacío", async () => {
    simularGoogle(respuestaGemini("   "));
    await expect(
      crearProveedor(config).redactar({ tipo: "Recurso", contexto: {}, fuentes: [] }),
    ).rejects.toThrow(ErrorIA);
  });
});

describe("openrouter (ADR 0003)", () => {
  function simularOpenAI(contenido: string, modelo = "or-model") {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: contenido } }], model: modelo }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as unknown as typeof fetch;
  }

  it("es un proveedor válido con nombre 'openrouter' y urlBase por defecto", () => {
    const p = crearProveedorDesdeEntorno({ IA_PROVEEDOR: "openrouter", IA_API_KEY: "k" });
    expect(p.nombre).toBe("openrouter");
  });

  it("respeta una IA_URL_BASE explícita", () => {
    // Solo verifica que se construye sin error; la URL se usa en el fetch.
    const p = crearProveedorDesdeEntorno({
      IA_PROVEEDOR: "openrouter", IA_API_KEY: "k",
      IA_URL_BASE: "https://ejemplo.com/v1/chat/completions",
    });
    expect(p.nombre).toBe("openrouter");
  });

  it("llamar() devuelve {contenido, modelo} respetando el contrato del puente", async () => {
    simularOpenAI("RESPUESTA DEL MODELO");
    const r = await crearProveedorDesdeEntorno({
      IA_PROVEEDOR: "openrouter", IA_API_KEY: "k",
      IA_MODELO_EXTRACCION: "or-ext", IA_MODELO_ANALISIS: "or-ana",
    }).llamar({
      modelo: "or-ext",
      sistema: "sistema de prueba",
      bloques: [{ tipo: "texto", texto: "hola" }],
      jsonEstricto: true,
    });
    expect(r.contenido).toBe("RESPUESTA DEL MODELO");
    expect(r.modelo).toBe("or-model");
  });
});
