# Prototipo de referencia del marco

Implementación en TypeScript del servicio emisor (algoritmo 1), el registro de evidencias (algoritmos 2 y 3), el testigo externo (raíz MTH de RFC 9162) y el verificador (algoritmo 4, pasos V1–V7) descritos en el capítulo 4 del trabajo. Las primitivas criptográficas (SHA-256 y Ed25519) proceden del módulo estándar `node:crypto`; el marco no usa bibliotecas externas.

La evaluación del trabajo (apartado 4.5) no se hace a mano: cada escenario, cada prueba y el ejemplo resuelto del apartado 4.3 son pruebas ejecutables cuyo informe es la evidencia de los resultados.

## Del modelo al código

[`MODELO.md`](MODELO.md) acompaña al apartado 4.3 del trabajo: para cada ecuación indica la función que la implementa (con enlace a sus líneas), cómo lo hace paso a paso, dónde se usa en el marco y qué prueba la comprueba, y relaciona cada línea del pseudocódigo de los algoritmos 1 a 4 con su código.

## Estructura

```
src/marco.ts                Modelo (ecuaciones 1–10), componentes y verificador
MODELO.md                   Del modelo al código: cada ecuación y cada línea del pseudocódigo, con su función
src/evaluacion.ts           Programa de evaluación: 55 casos con su resultado esperado (tablas 12 y 13)
src/vectores.ts             Exporta los vectores del caso de estudio para la implementación en Python
e2e/caracteristicas/        Casos de prueba en Gherkin (español), uno por escenario o prueba
e2e/pasos/pasos.ts          Pasos Dado / Cuando / Entonces sobre los componentes del marco
e2e/pasos/ejemplo.ts        Pasos del ejemplo resuelto: comprueban cada valor intermedio del apartado 4.3
e2e/soporte/mundo.ts        Mundo de cada escenario: registro, testigo y servicios nuevos en cada caso
e2e/resumen.ts              Resume el informe de Cucumber en informes/resumen.md
cucumber.mjs                Configuración de Cucumber
eslint.config.mjs           Configuración del análisis estático (ESLint + typescript-eslint)
tsconfig.json               Configuración de TypeScript (modo estricto)
informes/                   e2e.html (informe completo) y resumen.md, que generan las pruebas E2E
resultados/                 resultados.json y resultados.md, que genera el programa de evaluación
vectores/vectores.json      Vectores exportados que compara la implementación en Python
```

## Requisitos y órdenes

Node.js 22 o superior. Las dependencias de desarrollo solo sirven para ejecutar, comprobar y probar el código; el marco no las usa.

```bash
npm install
npm run probar            # todo lo que ejecuta la integración continua: tipos, lint, E2E, resumen y evaluación
npm run tipos             # comprobación de tipos (tsc, modo estricto)
npm run lint              # análisis estático con ESLint y typescript-eslint
npm run lint:corregir     # corrige automáticamente lo que admite corrección
npm run e2e               # 50 escenarios E2E (Cucumber); informe en informes/e2e.html
npm run e2e -- --tags @RF-05   # solo los escenarios de un requisito, amenaza, supuesto o apartado
npm run e2e:resumen       # resumen en informes/resumen.md
npm run evaluar           # 55 casos; termina con código 1 si alguno no coincide
npm run evaluar:detalle   # igual, mostrando el motivo de cada resultado
npm run vectores          # exporta vectores/vectores.json
```

Versiones de la ejecución documentada: Node.js 22.23.5, TypeScript 5.9.3, tsx 4.23.15, Cucumber 13.3.0, ESLint 10.15.0 y typescript-eslint 8.74.0.

Las claves Ed25519 son de demostración: la semilla de cada una es H(«clave-demo-» || servicio), así que todas las ejecuciones producen las mismas firmas y los mismos valores. No deben usarse fuera de este contexto.

## Pruebas de extremo a extremo

Cada escenario de la tabla 11 del trabajo, cada prueba de la tabla 13 y el ejemplo resuelto del apartado 4.3 son casos de prueba en Gherkin, escritos en español con *Dado / Cuando / Entonces*. Cada caso recorre el marco completo sobre los componentes del prototipo, sin simulaciones:

1. los servicios emiten y firman los eventos de la saga (algoritmo 1);
2. el registro de evidencias los recibe en el orden de entrega indicado (algoritmo 2);
3. el registro cierra la transacción y ancla el periodo en el testigo (algoritmo 3);
4. el atacante, si lo hay, actúa sobre el historial conservado, una firma o el punto de referencia;
5. el auditor ejecuta el verificador (algoritmo 4) con las evidencias disponibles.

Cada escenario empieza con un registro, un testigo y unos servicios nuevos, de modo que es independiente de los demás. Las etiquetas enlazan cada caso con su requisito (`@RF-05`), amenaza (`@amenaza-alteración`), supuesto (`@supuesto-S3`), tabla (`@tabla-12`) o apartado (`@apartado-4.3.4`) del trabajo. El paso «fallan los pasos» exige exactamente el conjunto de pasos V1–V7 que detectan la manipulación, no solo el resultado global.

| Característica | Escenarios | En el trabajo |
|---|---|---|
| `01-manipulaciones.feature` | 1, 2, 3, 6a, 6b, C1, C2, C3 | Tablas 11 y 12 |
| `02-saga.feature` | 4a, 4b, 5a, 5b | Tablas 11 y 12 |
| `03-testigo.feature` | T1–T6 | Tabla 13 |
| `04-datos-negocio.feature` | D1–D4 | Tabla 13 |
| `05-reintentos.feature` | I1–I7 | Tabla 13 |
| `06-entradas-invalidas.feature` | X1–X12 | Tabla 13 |
| `07-fuera-de-orden.feature` | O1–O5 | Tabla 13 |
| `08-ejemplo-resuelto.feature` | Codificación y resumen de E1, cadena de acumulación, efecto de una manipulación, firma y punto de referencia, árbol de Merkle, verificación paso a paso y valores A₅ publicados | Apartados 4.3.2 a 4.3.6, tabla 10 y anexo B |

El ejemplo resuelto recalcula en los pasos, de forma independiente de `marco.ts`, las codificaciones de cada campo, los nodos del árbol y el recorrido de la prueba de inclusión, y los contrasta con lo que producen los componentes del marco.

Para comprobar que las pruebas detectan defectos, y no solo confirman el comportamiento actual, se probaron dos mutantes del verificador: con la comprobación causal V4 desactivada fallan 6 escenarios, y con el prefijo «ACU» de la ecuación 5 cambiado fallan los 6 que fijan valores concretos. Con el código original pasan los 50.

## Análisis estático

`eslint.config.mjs` aplica las reglas `recommended` de ESLint y los conjuntos `strictTypeChecked` y `stylisticTypeChecked` de typescript-eslint. Estos conjuntos usan la información de tipos del compilador para detectar, entre otros, accesos a valores `any`, aserciones innecesarias, condiciones siempre verdaderas o falsas y métodos usados sin su objeto. Hay dos ajustes:

- se permiten números en las plantillas de texto, habituales en los mensajes del verificador;
- en las pruebas (`e2e/`) se permite la aserción no nula (`!`): un valor ausente es un fallo del escenario.

En el código del marco no hay aserciones no nulas: los valores opcionales se comprueban de forma explícita.

## Integración continua

El flujo [`../.github/workflows/pruebas.yml`](../.github/workflows/pruebas.yml) se ejecuta en cada push en Linux, Windows y macOS. Comprueba los tipos, ejecuta ESLint y Ruff, las pruebas E2E, el programa de evaluación y la comparación de vectores con Python, y publica `informes/` y `resultados/` como artefactos de cada ejecución.

## Decisiones de diseño (observaciones de la segunda entrega)

### Obs. 1: tres resultados de verificación

Cada paso V1–V7 termina en uno de estos estados:

| Estado del paso | Significado |
|---|---|
| CORRECTO | La comprobación se cumple. |
| INCORRECTO | Se detecta una inconsistencia criptográfica, causal o transaccional. |
| SIN_EVIDENCIA | Falta una evidencia indispensable para la comprobación. |
| OMITIDO | No se ejecuta porque la entrada está mal formada (V2 INCORRECTO). |

El resultado global se obtiene así:

- **INVÁLIDO**: algún paso es INCORRECTO. Se informa el primero, en el orden V1…V7.
- **NO_VERIFICABLE**: ningún paso es INCORRECTO, pero alguno queda SIN_EVIDENCIA.
- **VÁLIDO**: todos los pasos son CORRECTO.

Una inconsistencia detectada prevalece sobre la falta de evidencias, porque basta por sí sola para rechazar el historial (caso T6). La ausencia de inconsistencias sin un compromiso externo solo establece la **consistencia interna** del historial: un atacante con el control del registro y de las claves puede construir otro igual de coherente (6a).

V1 distingue un compromiso **no disponible** de uno **inválido**:

| Situación | Estado de V1 |
|---|---|
| No hay punto de referencia K_t | SIN_EVIDENCIA |
| El directorio no contiene la clave del registro | SIN_EVIDENCIA |
| Falta la raíz del testigo | SIN_EVIDENCIA |
| Falta la prueba de inclusión | SIN_EVIDENCIA |
| K_t mal formado o con la firma del registro inválida | INCORRECTO |
| Prueba de inclusión mal formada | INCORRECTO |
| K_t no incluido en la raíz del testigo | INCORRECTO |
| K_t incluido en la raíz del testigo | CORRECTO |

Sin K_t, V5 también queda SIN_EVIDENCIA: Aₙ se puede recalcular, pero no hay un valor comprometido con el que compararlo.

### Obs. 2: separación entre datos de negocio y evidencias (RNF-06)

- **Estructura local**: `ServicioEmisor.almacenLocal`. Contiene los datos de negocio y no sale del servicio.
- **Evento verificable**: `EventoVerificable = (t, e, s, τ, k, a, P, c)`, con c = H(datos). Lo construye el servicio en `emitir()` sin incluir los datos, y es lo único que firma y entrega.
- El registro valida la forma exacta del evento con `validarEvento`. Rechaza cualquier campo adicional, como `data` (D2), y el verificador hace lo mismo en V2 (D3).
- **Prueba de cumplimiento (D1)**: se serializa todo lo que conserva el registro (historiales, puntos de referencia y cola de pendientes) y se comprueba que no contiene ninguno de los 32 datos de negocio emitidos, ni como texto ni en hexadecimal, ni términos como «importe», «500000» o «EUR».
- **Limitación (D4)**: un resumen no oculta datos predecibles. Probando valores de riesgo de 0,00 a 1,00, el resumen c de E3 se invierte en 13 intentos. El modelo protege la integridad de los datos, no su confidencialidad frente a ataques por diccionario. La mitigación habitual es un compromiso con un valor secreto aleatorio, c = H(r || datos) o HMAC, que el servicio conserva junto a los datos y entrega al auditor para V7. No se adopta por defecto para conservar los vectores publicados; queda descrita como extensión.
- La V7 opcional sigue disponible: el auditor obtiene los datos del servicio (`ServicioEmisor.datos`) y los compara con c.

### Obs. 3: reglas de reintento (RF-05, V6)

Para cada clave de operación k, con el conjunto de intentos I_k:

- **RI1**: todos los intentos los emite el mismo servicio.
- **RI2**: no hay dos eventos con el mismo número de intento. Si los hay, es una duplicación.
- **RI3**: los números de intento, ordenados, son exactamente 1, 2, …, m: empiezan en 1 y no tienen huecos.
- **RI4**: todos los intentos tienen el mismo tipo τ y el mismo resumen c. Una operación idempotente devuelve el mismo resultado (Helland, 2012).
- **RI5**: si se cumplen RI1–RI4, la operación produce **una sola** transición del autómata M.

Tratamiento de los casos especiales:

- **Reentregas idénticas** (mismo e y mismo d(E)): el registro las descarta antes de incorporarlas («IGNORADO»), así que nunca llegan a V6.
- **Llegadas fuera de orden entre intentos**: no se exige un orden de registro entre ellos. Con una entrega «al menos una vez» pueden llegar desordenados, y la numeración se comprueba sobre el conjunto ordenado (I6).
- **Huecos y numeración que no empieza en 1**: dan INVÁLIDO. Con Transactional Outbox, todo intento ejecutado queda en la tabla de salida y termina entregándose, así que un hueco en una transacción cerrada y anclada solo se explica por un evento eliminado o no emitido.

### Obs. 4: manejo de errores

Ninguna función lanza excepciones ante entradas inválidas: el registro responde con un estado y un motivo, y el verificador con un informe. Como última defensa, el verificador convierte cualquier excepción inesperada en INVÁLIDO en V2.

| Caso | Registro | Verificador |
|---|---|---|
| A. Emisor desconocido | RECHAZADO «emisor no reconocido en el directorio» (X1) | V3 INCORRECTO con el mismo motivo (X2) |
| B. Periodo sin transacciones | MTH({}) = SHA-256() = `e3b0c442…`, según RFC 9162, 2.1.1. La prueba de inclusión de un índice inexistente devuelve `undefined` (X3). | — |
| C. Referencia causal inexistente | PENDIENTE y, al vencer el plazo, RECHAZADO y notificado como incidencia (X4) | V4 «referencia causal inexistente» (X5) |
| D1. Firma de un emisor desconocido | Distinta de una firma inválida: CLAVE_DESCONOCIDA (X1) | Ídem (X2) |
| D2. Firma inválida | INVÁLIDA (X6) | Ídem (X6) |
| D3. Firma mal formada (longitud distinta de 64 bytes) | MAL_FORMADA (X8) | Ídem (X7) |
| D4. Evento mal formado | RECHAZADO «estructura no conforme» (X10) | V2 «entrada mal formada»; V3–V7 OMITIDO (X9 y X11) |
| Cierre de una transacción desconocida | Error controlado (X12) | — |

### Obs. 7 (parte del prototipo): eventos que llegan antes que sus dependencias

1. Si faltan dependencias de un evento con estructura y firma válidas, el registro lo deja PENDIENTE. Antes comprueba la firma, para no ocupar la cola con eventos falsos.
2. Cada vez que acepta un evento, vuelve a evaluar los pendientes hasta que ninguno pueda aceptarse. Los liberados se incorporan a la cadena en el orden de aceptación.
3. Cada pendiente tiene un plazo de `PLAZO_PENDIENTE` recepciones. El reloj es lógico para que las pruebas sean reproducibles; en un despliegue sería un plazo de tiempo. La cola admite como máximo `MAX_PENDIENTES` eventos, lo que evita esperas y consumo de memoria ilimitados.
4. Los pendientes vencidos se rechazan y se notifican como incidencias, para que el servicio o el orquestador reenvíen el evento o activen el reverso.
5. No se puede cerrar una transacción con eventos pendientes (O3). Si se cierra tras el vencimiento, el historial incompleto se verifica como INVÁLIDO (O5).

## Resultados

Los 50 escenarios E2E pasan (`informes/resumen.md`, con el detalle de cada paso en `informes/e2e.html`). Los 55 casos del programa de evaluación producen el resultado esperado (`resultados/resultados.md`). Entre ellos están los ocho vectores de regresión, los escenarios 1–6b y las pruebas C1–C3 de la segunda entrega, y 35 casos nuevos: la respuesta del registro a la reentrega (4a-r), T1–T6, D1–D4, I1–I7, X1–X12 y O1–O5.

Cambio de resultado respecto de la segunda entrega: **6a pasa de VÁLIDO a NO_VERIFICABLE**. Los demás escenarios mantienen su resultado, sus pasos fallidos y sus valores Aₙ.
