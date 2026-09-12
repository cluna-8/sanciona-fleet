# Flujos del sistema

Cómo circula una multa por Sanciona Fleet, de principio a fin. Los diagramas
usan Mermaid y se renderizan directamente en GitHub.

---

## 1. Recorrido completo de un expediente

```mermaid
flowchart TD
    A["Llega la notificacion<br/>PDF o foto"] --> B["Subida al sistema<br/>max 15 MB"]
    B --> C["Extraccion con IA<br/>OCR + campos + confianza"]
    C --> D{"Coincide el CIF<br/>con la empresa?"}
    D -- No --> E["BLOQUEO<br/>exige confirmacion expresa"]
    D -- Si --> F["Revision humana<br/>campo a campo"]
    E --> F
    F --> G["Se crea el expediente"]
    G --> H["Motor de plazos<br/>determinista, sin IA"]
    G --> I["Avisos internos"]
    H --> J["Analisis con IA<br/>semaforo + recomendacion"]
    J --> K{"Que se decide?"}
    K -- "Pagar" --> L["Pagar con reduccion<br/>renuncia a recurrir"]
    K -- "Defender" --> M["Borrador de alegaciones<br/>o recurso"]
    K -- "Identificar" --> N["Identificar al conductor"]
    M --> O{"Revisor juridico<br/>lo valida?"}
    O -- No --> M
    O -- Si --> P["Presentado ante el organismo"]
    P --> Q["Resuelta favorable<br/>o desfavorable"]
    L --> R["Pagada"]
    N --> K

    style E fill:#fde2e2,stroke:#c0392b
    style H fill:#e8f4ea,stroke:#27ae60
    style O fill:#fff3cd,stroke:#b8860b
```

Dos puntos de control humano, en verde y ámbar, que son el corazón del producto:

- **El motor de plazos no usa IA.** Es determinista y auditable, porque un error
  aquí hace perder un plazo legal.
- **Ningún escrito sale sin que un revisor jurídico lo valide.** La IA redacta;
  una persona responde.

---

## 2. Alta desde documento, paso a paso

```mermaid
sequenceDiagram
    actor U as Gestor
    participant W as bff-web
    participant S as Storage
    participant X as extraction-service
    participant IA as Proveedor de IA
    participant D as deadlines-service
    participant BD as Base de datos

    U->>W: Sube el PDF de la multa
    W->>S: Guarda en {orgId}/entrada/...
    W->>BD: Crea sanction_extraction (Documento recibido)
    W->>X: procesar(extractionId)
    X->>S: Descarga el documento
    X->>IA: extraer() con prompt de extraccion
    IA-->>X: campos + confianza + fragmento origen
    X->>BD: Busca matricula en vehicles
    X->>BD: Busca conductor en drivers
    Note over X: Si falta algo o hay confianza baja<br/>-> "Revision requerida"
    X-->>W: campos, avisos, sugerencias
    W-->>U: Formulario editable, campos dudosos marcados
    U->>W: Corrige y confirma
    W->>BD: Crea la sancion (~30 campos)
    W->>D: calcular(plazos)
    D-->>W: 4 plazos con su estado
    W->>BD: Guarda plazos, actuaciones y avisos
    W-->>U: Expediente creado
```

Lo que hace este flujo distinto de "subir un PDF y fiarse": **cada campo llega
con su nivel de confianza y el fragmento literal del documento del que salió**,
y los siete campos críticos se marcan para verificar si la confianza es baja.
La IA propone; el gestor confirma.

---

## 3. Máquina de estados del expediente

🟡 Propuesta de SPEC.md §4.2, **pendiente de confirmación**. Hoy el sistema
permite ir de cualquier estado a cualquier otro sin restricción.

```mermaid
stateDiagram-v2
    [*] --> Nueva
    Nueva --> PendienteDoc: falta documentacion
    Nueva --> PendienteId: requiere identificar conductor
    Nueva --> PendienteRev
    PendienteDoc --> PendienteRev
    PendienteId --> PendienteRev
    PendienteRev --> PagarDescuento: conviene pagar
    PendienteRev --> PrepararAleg: hay motivos
    PrepararAleg --> AlegPresentadas
    AlegPresentadas --> RecursoPresentado: desestimadas
    AlegPresentadas --> ResueltaFav
    AlegPresentadas --> ResueltaDesfav
    RecursoPresentado --> ResueltaFav
    RecursoPresentado --> ResueltaDesfav
    PagarDescuento --> Pagada
    ResueltaDesfav --> Pagada
    ResueltaFav --> [*]
    Pagada --> [*]
    Archivada --> [*]

    note right of Archivada
        Desde cualquier estado,
        solo admin_empresa
    end note
```

Cada transición debe registrarse en `sanction_actions` **con estado origen y
destino**. Hoy solo se guarda el literal "Cambio de estado", sin ese detalle.

---

## 4. Cómo decide el motor de plazos

```mermaid
flowchart TD
    A["Entrada del expediente"] --> B{"Hay fecha de<br/>notificacion?"}
    B -- No --> C{"Hay fecha de<br/>recepcion?"}
    C -- No --> D["Plazo pendiente<br/>de determinar"]
    B -- Si --> E["Base = notificacion"]
    C -- Si --> F["Base = recepcion"]
    E --> G{"Que regimen?"}
    F --> G
    G -- Trafico --> H["Pago 20 nat.<br/>Alegaciones 20 nat.<br/>Identificacion 15 nat."]
    G -- Transporte --> I["Alegaciones 15 hab.<br/>Pago 15 hab.<br/>no fiable"]
    G -- Generico --> J["Alegaciones 15 hab.<br/>no fiable"]
    H --> K{"El documento trae<br/>fecha expresa?"}
    I --> K
    J --> K
    K -- No --> L{"Regla fiable?"}
    L -- Si --> M["Calculado"]
    L -- No --> N["Pendiente<br/>de verificacion"]
    K -- Si --> O{"Difieren mas<br/>de 1 dia?"}
    O -- No --> P["Confirmado"]
    O -- Si --> Q["Pendiente de verificacion<br/>+ dias de discrepancia"]

    style D fill:#f0f0f0,stroke:#888
    style N fill:#fff3cd,stroke:#b8860b
    style Q fill:#fff3cd,stroke:#b8860b
    style P fill:#e8f4ea,stroke:#27ae60
```

Tres decisiones de diseño que conviene entender:

1. **Nunca se calcula desde la fecha de emisión.** Si falta la notificación, el
   plazo queda "pendiente de determinar" antes que dar una fecha falsa.
2. **El documento manda sobre el cálculo**, pero se contrasta: si discrepan más
   de un día, se avisa con los días exactos de diferencia.
3. **Las reglas poco fiables se marcan como tales**, no se presentan con la
   misma autoridad que las seguras.

---

## 5. Arquitectura objetivo

```mermaid
flowchart TB
    subgraph cliente["Navegador"]
        UI["bff-web<br/>TanStack Start"]
    end

    subgraph workers["Cloudflare Workers"]
        ID["identity-service"]
        FL["fleet-service"]
        SA["sanctions-service"]
        EX["extraction-service"]
        DL["deadlines-service"]
        AN["analysis-service"]
        DR["drafts-service"]
        DO["documents-service"]
        NO["notifications-service"]
        RE["reporting-service"]
        LE["legal-catalog-service"]
    end

    subgraph compartido["packages/"]
        CO["contracts<br/>tipos compartidos"]
        AI["ai-provider<br/>interfaz de IA"]
    end

    subgraph externo["Externos"]
        SB[("Supabase<br/>Postgres + Auth + Storage")]
        LLM["Proveedor de IA"]
    end

    UI --> ID & FL & SA & EX & DL & AN & DR & DO & NO & RE
    EX & AN & DR --> AI
    AI --> LLM
    ID & FL & SA & EX & AN & DR & DO & NO & RE & LE --> SB
    EX & AN & DR & DL & SA --> CO

    style DL fill:#e8f4ea,stroke:#27ae60
    style AI fill:#e8f4ea,stroke:#27ae60
    style CO fill:#e8f4ea,stroke:#27ae60
```

En verde, lo que **ya está construido y con tests**: `deadlines-service`,
`packages/ai-provider` y `packages/contracts`. El resto sigue dentro del
monolito heredado, y se irá extrayendo en el orden de SPEC.md §7.5.
