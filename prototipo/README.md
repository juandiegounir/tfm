# Prototipo de referencia del marco (versión de la 3.ª entrega)

Implementación en TypeScript del servicio emisor (algoritmo 1), el registro de evidencias (algoritmos 2 y 3), el testigo externo (raíz MTH de RFC 9162) y el verificador (algoritmo 4, pasos V1–V7). Esta versión incorpora las observaciones 1, 2, 3, 4 y, en la parte del prototipo, la 7, de la revisión de la segunda entrega.

## Estructura

```
src/marco.ts        Modelo (ecuaciones 1–10), componentes y verificador
src/evaluacion.ts   Escenarios del caso de estudio y pruebas nuevas, con su resultado esperado
resultados/         resultados.json y resultados.md, que genera la evaluación
```

## Reproducción

Requisitos: Node.js 22 o superior. Las primitivas criptográficas (SHA-256 y Ed25519) proceden del módulo estándar `node:crypto`. Las dependencias de desarrollo (`tsx`, `typescript` y `@types/node`) solo sirven para ejecutar y comprobar los tipos.

```bash
npm install
npm run evaluar           # ejecuta los 55 casos; termina con código 1 si alguno no coincide
npm run evaluar:detalle   # igual, mostrando el motivo de cada resultado
npm run tipos             # comprobación de tipos (tsc, modo estricto)
```

Versiones usadas en la ejecución documentada: Node.js 22.23.5, TypeScript 5.9.3 y tsx 4.23.15.

Las claves Ed25519 son de demostración. La semilla de cada una es H(«clave-demo-» || servicio), así que todas las ejecuciones producen las mismas firmas y los mismos valores. El periodo 1 contiene exactamente las cinco transacciones de la segunda entrega, por lo que sus vectores no cambian: d(E1) = `ef95dee9…20b5d`, raíz = `b968809d…87c60` y los A₅ de la tabla del anexo. La evaluación comprueba estos vectores como pruebas de regresión. Las pruebas nuevas se anclan en un periodo 2 independiente (raíz `9e3d7e1d…f7502`).

## Cambios respecto de la segunda entrega

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

Los 55 casos producen el resultado esperado (`resultados/resultados.md`). Entre ellos están los ocho vectores de regresión, los escenarios 1–6b y las pruebas C1–C3 de la segunda entrega, y 35 casos nuevos: la respuesta del registro a la reentrega (4a-r), T1–T6, D1–D4, I1–I7, X1–X12 y O1–O5.

Cambio de resultado respecto de la segunda entrega: **6a pasa de VÁLIDO a NO_VERIFICABLE**. Los demás escenarios mantienen su resultado, sus pasos fallidos y sus valores Aₙ.
