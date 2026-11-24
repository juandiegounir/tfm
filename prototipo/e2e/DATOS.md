# Datos de prueba del caso de estudio

Las transacciones, los eventos, los datos de negocio y las claves del caso de estudio **no forman parte del marco**: son las **entradas de las pruebas**. Por eso el trabajo no los reproduce. El modelo (apartado 4.3) se describe sin valores concretos. Los valores los calcula y comprueba el ejemplo resuelto ejecutable ([`caracteristicas/08-ejemplo-resuelto.feature`](caracteristicas/08-ejemplo-resuelto.feature)). La metodología de evaluación (apartados 3.5 y 4.6.2) remite a este documento.

Cada característica Gherkin declara sus datos en la sección `Antecedentes` o en el paso `Dado que la saga "…" emite los eventos:`. El programa de evaluación ([`../src/evaluacion.ts`](../src/evaluacion.ts)) y la implementación en Python ([`../../python/marco.py`](../../python/marco.py)) usan los mismos datos. Todos los datos son ficticios.

## Claves de demostración

Cada servicio (`orquestador`, `cuentas`, `antifraude`) y el registro de evidencias (`registro`) tienen una clave Ed25519. La semilla de cada clave es `H(«clave-demo-» || nombre)` (función `claveDemo` de [`../src/marco.ts`](../src/marco.ts)), así que cualquier ejecución reproduce las mismas firmas. Son claves de demostración: no deben usarse fuera de este contexto.

## Transacción de referencia: TX-2026-000123 (ejecución normal)

Es la transferencia interbancaria que acompaña todo el trabajo: una orden de 500 000 EUR de la cuenta 0001 a la cuenta 0002.

| e  | servicio    | tipo            | clave | intento | depende de | datos de negocio (solo en el servicio emisor)       |
|----|-------------|-----------------|-------|---------|------------|------------------------------------------------------|
| E1 | orquestador | INICIO          | op-1  | 1       | —          | `origen=0001;destino=0002;importe=500000;moneda=EUR` |
| E2 | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | `resultado=ok;saldo_suficiente=si`                   |
| E3 | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | `resultado=aprobada;riesgo=0.12`                     |
| E4 | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | `debito=0001;abono=0002;importe=500000;resultado=ok` |
| E5 | orquestador | CONFIRMACION    | op-5  | 1       | E4         | `estado=confirmada`                                  |

E2 y E3 son concurrentes: ambos dependen solo de E1. Los ficheros 01, 03, 04, 06 y 08 parten de esta transacción y aplican sobre ella la manipulación o la entrada inválida de cada caso. Por ejemplo, la alteración de los escenarios 2 y 6 cambia los datos de E3 a `resultado=aprobada;riesgo=0.92`.

## Variantes de la transacción de referencia

Cada variante cambia solo lo que indica la tabla; el resto de eventos es igual que en la transacción de referencia.

| Transacción     | Fichero                    | Caso   | Diferencia respecto de la transacción de referencia                                    |
|-----------------|----------------------------|--------|----------------------------------------------------------------------------------------|
| TX-2026-000124  | `02-saga.feature`          | 4a     | E3 se reentrega y se reintenta como E3b (op-3, intento 2); E4 depende de E2 y E3b         |
| TX-2026-000125  | `02-saga.feature`          | 5a     | E4 = EJECUCION_FALLO; E5 = COMPENSACION (cuentas, op-6) que depende de E2 y E4            |
| TX-2026-000126  | `02-saga.feature`          | 4b     | E3d duplica E3 (op-3, intento 1)                                                         |
| TX-2026-000127  | `02-saga.feature`          | 5b     | E4 = EJECUCION_OK seguido de una COMPENSACION sin fallo previo                           |
| TX-2026-000201  | `05-reintentos.feature`    | I1     | Intentos 1, 2 y 3 de op-3 (E3, E3b, E3c)                                                 |
| TX-2026-000202  | `05-reintentos.feature`    | I2     | Intentos 1 y 3 de op-3 (falta el 2)                                                      |
| TX-2026-000203  | `05-reintentos.feature`    | I3     | Único intento de op-3 con número 9                                                       |
| TX-2026-000204  | `05-reintentos.feature`    | I4     | Dos intentos 1 de op-3 con distinto contenido (`riesgo=0.50`)                            |
| TX-2026-000205  | `05-reintentos.feature`    | I5     | Intentos 1 y 2 de op-3 con resultados distintos                                          |
| TX-2026-000206  | `05-reintentos.feature`    | I6     | El intento 2 de op-3 se registra antes que el 1                                          |
| TX-2026-000207  | `05-reintentos.feature`    | I7     | El intento 2 de op-3 lo emite el servicio `cuentas`                                      |
| TX-2026-000210  | `07-fuera-de-orden.feature`| O1, O2 | Orden de entrega E1, E2, E4, E3, E5 (E4 llega antes que E3)                              |
| TX-2026-000211  | `07-fuera-de-orden.feature`| O3–O5  | E3 no llega nunca                                                                        |

## Periodos de anclaje

| Periodo | Transacciones                         | Uso |
|---------|---------------------------------------|-----|
| P1      | TX-2026-000123 a TX-2026-000127        | Caso de estudio: escenarios 1–6, pruebas T, D y X, ejemplo resuelto y vectores TypeScript–Python |
| P2      | TX-2026-000201 a TX-2026-000211        | Reintentos (I) y llegada fuera de orden (O). Están en un periodo aparte para no alterar la raíz de P1 |

## Salidas que se comprueban

Los resultados esperados de cada caso están en los pasos `Entonces` de cada característica. Los valores intermedios del modelo (codificaciones, resúmenes, cadena A₀–A₅, firmas, K_t, árbol de Merkle y prueba de inclusión) están en el ejemplo resuelto. Los 40 vectores de la comparación con Python están en [`../vectores/`](../vectores).
