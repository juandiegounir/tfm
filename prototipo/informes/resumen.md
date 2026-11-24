# Resumen de las pruebas de extremo a extremo

50/50 escenarios pasan (472 pasos). Informe completo: informes/e2e.html.

| Característica | Escenario | Trazabilidad | Pasos | Estado |
|---|---|---|---|---|
| 01-manipulaciones.feature | 1 · Ejecución normal | escenario-1 RF-01 RF-02 | 7 | pasa |
| 01-manipulaciones.feature | 2 · Alteración del contenido de un evento | escenario-2 RF-02 amenaza-alteración | 10 | pasa |
| 01-manipulaciones.feature | 3 · Eliminación de un evento intermedio | escenario-3 RF-04 amenaza-eliminación | 9 | pasa |
| 01-manipulaciones.feature | 6a · Reconstrucción completa del historial sin la raíz del testigo | escenario-6a RF-03 amenaza-reconstrucción supuesto-S3 | 9 | pasa |
| 01-manipulaciones.feature | 6b · Reconstrucción completa del historial con la raíz del testigo | escenario-6b RF-03 amenaza-reconstrucción supuesto-S3 | 9 | pasa |
| 01-manipulaciones.feature | C1 · Reordenamiento de dos eventos dependientes | complementaria RF-04 amenaza-reordenamiento | 9 | pasa |
| 01-manipulaciones.feature | C2 · Inserción de un evento firmado con una clave ajena | complementaria RF-06 amenaza-inserción | 9 | pasa |
| 01-manipulaciones.feature | C3 · Suplantación de un servicio por otro | complementaria RF-06 amenaza-suplantación | 9 | pasa |
| 02-saga.feature | 4a · Reintento legítimo tras un fallo de comunicación | RF-05 escenario-4a RF-01 | 8 | pasa |
| 02-saga.feature | 4b · Duplicación de un evento | RF-05 escenario-4b amenaza-duplicación | 9 | pasa |
| 02-saga.feature | 5a · Reverso tras un fallo de ejecución | RF-05 escenario-5a | 7 | pasa |
| 02-saga.feature | 5b · Reverso sin fallo previo | RF-05 escenario-5b amenaza-reverso-indebido | 8 | pasa |
| 03-testigo.feature | T1 · Historial íntegro sin la prueba de inclusión | RF-03 supuesto-S3 T1 | 8 | pasa |
| 03-testigo.feature | T2 · Historial íntegro sin punto de referencia | RF-03 supuesto-S3 T2 | 8 | pasa |
| 03-testigo.feature | T3 · Raíz de otro periodo | RF-03 supuesto-S3 T3 | 8 | pasa |
| 03-testigo.feature | T4 · Punto de referencia con la firma del registro alterada | RF-03 supuesto-S3 T4 | 9 | pasa |
| 03-testigo.feature | T5 · Prueba de inclusión mal formada | RF-03 supuesto-S3 T5 | 8 | pasa |
| 03-testigo.feature | T6 · Alteración detectada aunque falte el testigo | RF-03 supuesto-S3 T6 amenaza-alteración | 9 | pasa |
| 04-datos-negocio.feature | D1 · El registro no conserva datos de negocio | RNF-06 D1 | 6 | pasa |
| 04-datos-negocio.feature | D2 · El registro rechaza un evento con datos de negocio incrustados | RNF-06 D2 | 7 | pasa |
| 04-datos-negocio.feature | D3 · El verificador rechaza un historial con datos de negocio incrustados | RNF-06 D3 | 9 | pasa |
| 04-datos-negocio.feature | D4 · Ataque por diccionario sobre el resumen de un dato predecible | RNF-06 D4 limitación | 7 | pasa |
| 05-reintentos.feature | I1 · Intentos 1, 2 y 3 | RF-05 I1 RF-01 | 7 | pasa |
| 05-reintentos.feature | I2 · Intentos 1 y 3, falta el 2 | RF-05 I2 | 9 | pasa |
| 05-reintentos.feature | I3 · Primer y único intento con número 9 | RF-05 I3 | 9 | pasa |
| 05-reintentos.feature | I4 · Dos eventos con intento 1 y distinto contenido | RF-05 I4 | 9 | pasa |
| 05-reintentos.feature | I5 · Intentos 1 y 2 con resultados distintos | RF-05 I5 | 9 | pasa |
| 05-reintentos.feature | I6 · Intento 2 registrado antes que el 1 | RF-05 I6 | 7 | pasa |
| 05-reintentos.feature | I7 · Intento 2 emitido por otro servicio | RF-05 I7 | 9 | pasa |
| 06-entradas-invalidas.feature | X1 · El registro rechaza un emisor que no está en el directorio | X1 RF-06 | 7 | pasa |
| 06-entradas-invalidas.feature | X2 · El verificador rechaza un evento atribuido a un emisor desconocido | X2 RF-06 | 9 | pasa |
| 06-entradas-invalidas.feature | X3 · Árbol de Merkle de un periodo sin transacciones | X3 | 8 | pasa |
| 06-entradas-invalidas.feature | X4 · El registro deja en espera una referencia causal inexistente y la descarta al vencer el plazo | X4 supuesto-S4 | 8 | pasa |
| 06-entradas-invalidas.feature | X5 · El verificador rechaza una referencia causal inexistente | X5 RF-04 | 9 | pasa |
| 06-entradas-invalidas.feature | X6 · Firma inválida con un byte alterado | X6 RF-06 | 9 | pasa |
| 06-entradas-invalidas.feature | X7 · Firma mal formada en el historial | X7 RF-06 | 9 | pasa |
| 06-entradas-invalidas.feature | X8 · El registro rechaza una firma mal formada | X8 | 7 | pasa |
| 06-entradas-invalidas.feature | X9 · El verificador rechaza un evento mal formado | X9 | 9 | pasa |
| 06-entradas-invalidas.feature | X10 · El registro rechaza un evento mal formado | X10 | 7 | pasa |
| 06-entradas-invalidas.feature | X11 · El verificador recibe un historial que no es una lista | X11 | 8 | pasa |
| 06-entradas-invalidas.feature | X12 · El registro no cierra una transacción desconocida | X12 | 7 | pasa |
| 07-fuera-de-orden.feature | O1 y O2 · E4 llega antes que E3, queda pendiente y la transacción se verifica después | supuesto-S4 O1 O2 RF-04 | 9 | pasa |
| 07-fuera-de-orden.feature | O3, O4 y O5 · E3 no llega nunca | supuesto-S4 O3 O4 O5 | 12 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.2 · Codificación canónica y resumen del evento E1 | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.2 ecuación-2 ecuación-3 | 17 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.4 · Cadena de acumulación de la ejecución normal | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.4 ecuación-4 ecuación-5 | 14 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.4 · Efecto de una manipulación y de otro orden válido sobre la cadena | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.4 | 16 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.5 · Firma de E1 y punto de referencia de TX-2026-000123 | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.5 ecuación-6 ecuación-8 | 18 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.5 · Árbol de Merkle del periodo P1 y prueba de inclusión | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.5 ecuación-9 ecuación-10 | 17 | pasa |
| 08-ejemplo-resuelto.feature | 4.3.6 · Verificación paso a paso de TX-2026-000123 | ejemplo-resuelto RNF-01 RNF-02 apartado-4.3.6 algoritmo-4 | 17 | pasa |
| 08-ejemplo-resuelto.feature | Valores acumulados finales publicados en el anexo B | ejemplo-resuelto RNF-01 RNF-02 valores-publicados anexo-B | 14 | pasa |
