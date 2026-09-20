/**
 * Política de reintentos ante errores transitorios (A-3a).
 *
 * Contra un `fetch` simulado con cola de respuestas: ni un byte sale a la
 * red. Config `reintentos: { maxIntentosExtra: 2, baseMs: 1 }` para que el
 * backoff no haga lenta la suite.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { ErrorIA } from "../src/errores";
import { crearProveedor } from "../src/index";

const fetchReal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchReal;
});

const config = {
  proveedor: "openai" as const,
  apiKey: "clave-de-prueba",
  modeloExtraccion: "modelo-test",
  modeloAnalisis: "modelo-test",
  reintentos: { maxIntentosExtra: 2, baseMs: 1 },
};

const EXITO = {
  choices: [{ message: { content: "hola" } }],
  model: "modelo-test",
  usage: { prompt_tokens: 10, completion_tokens: 5 },
};

const estado = { llamadas: 0 };

/**
 * Cola de respuestas simuladas; el último elemento se repite si la política
 * de reintentos agota la cola (un 429 persistente debe poder agotar).
 */
function simularRespuestas(
  respuestas: Array<{ status: number; cuerpo?: unknown; cabeceras?: Record<string, string> }>,
) {
  estado.llamadas = 0;
  let indice = 0;
  globalThis.fetch = (async () => {
    const spec = respuestas[Math.min(indice, respuestas.length - 1)];
    if (!spec) throw new Error("cola de respuestas vacía");
    indice++;
    estado.llamadas = indice;
    return new Response(
      spec.cuerpo === undefined ? "{}" : JSON.stringify(spec.cuerpo),
      {
        status: spec.status,
        headers: { "content-type": "application/json", ...(spec.cabeceras ?? {}) },
      },
    );
  }) as unknown as typeof fetch;
}

async function llamarPrueba(reintentos = config.reintentos) {
  const ia = crearProveedor({ ...config, reintentos });
  return ia.llamar({ modelo: "modelo-test", sistema: "sistema-test", bloques: [] });
}

describe("reintentos con backoff (A-3a)", () => {
  it("un 429 transitorio se reintenta y acaba en éxito (2 llamadas)", async () => {
    simularRespuestas([{ status: 429, cuerpo: { error: "rate limit" } }, { status: 200, cuerpo: EXITO }]);
    const salida = await llamarPrueba();
    expect(salida.contenido).toBe("hola");
    expect(estado.llamadas).toBe(2);
  });

  it("un 429 persistente agota los 3 intentos y falla con limite_peticiones", async () => {
    simularRespuestas([{ status: 429, cuerpo: {} }]);
    try {
      await llamarPrueba();
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("limite_peticiones");
    }
    expect(estado.llamadas).toBe(3);
  });

  it("un 402 sin_credito no reintenta: reintentarlo solo quemaría saldo", async () => {
    simularRespuestas([{ status: 402, cuerpo: {} }]);
    try {
      await llamarPrueba();
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("sin_credito");
    }
    expect(estado.llamadas).toBe(1);
  });

  it("un 500 transitorio se reintenta (no_disponible)", async () => {
    simularRespuestas([{ status: 500, cuerpo: {} }, { status: 200, cuerpo: EXITO }]);
    const salida = await llamarPrueba();
    expect(salida.contenido).toBe("hola");
    expect(estado.llamadas).toBe(2);
  });

  it("una respuesta vacía (sin_contenido) no reintenta", async () => {
    simularRespuestas([{ status: 200, cuerpo: { choices: [] } }, { status: 200, cuerpo: EXITO }]);
    try {
      await llamarPrueba();
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("sin_contenido");
    }
    expect(estado.llamadas).toBe(1);
  });

  it("el Retry-After del 429 llega al error como reintentarTrasMs en ms", async () => {
    simularRespuestas([{ status: 429, cuerpo: {}, cabeceras: { "retry-after": "2" } }]);
    // maxIntentosExtra 0: el error sale en la primera llamada y el test no
    // duerme los 2 s que pide la cabecera.
    try {
      await llamarPrueba({ maxIntentosExtra: 0, baseMs: 1 });
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).reintentarTrasMs).toBe(2000);
    }
    expect(estado.llamadas).toBe(1);
  });

  it("un Retry-After mayor que el tope falla al primer intento sin esperar", async () => {
    simularRespuestas([{ status: 429, cuerpo: {}, cabeceras: { "retry-after": "60" } }]);
    const inicio = Date.now();
    try {
      await llamarPrueba();
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect((e as ErrorIA).codigo).toBe("limite_peticiones");
    }
    expect(estado.llamadas).toBe(1);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });

  it("devuelve los tokens del usage para el log de gasto por organización", async () => {
    simularRespuestas([{ status: 200, cuerpo: EXITO }]);
    const salida = await llamarPrueba();
    expect(salida.tokens).toEqual({ entrada: 10, salida: 5 });
  });
});