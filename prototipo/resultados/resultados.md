| Id | Grupo | Descripción | Esperado | Obtenido | Pasos que fallan | Detalle | ✔ |
|---|---|---|---|---|---|---|---|
| V-d(E1) | Vectores | d(E1) de TX-2026-000123 | ef95dee90158 | ef95dee90158 | — | ef95dee9015803df2266eb9bf35c272ae8005afd5ee2d83670b989fc75e20b5d | sí |
| V-A₀ | Vectores | A₀ de TX-2026-000123 | de3182924a3b | de3182924a3b | — | de3182924a3b | sí |
| V-Raíz | Vectores | Raíz del periodo | b968809d7fd6 | b968809d7fd6 | — | b968809d7fd6ad3d3f88d79a1a2d5efca2dbc8c02890f8fe5d43607095187c60 | sí |
| V-A₅ | Vectores | A₅ de TX-2026-000123 | 8b811cdbda03 | 8b811cdbda03 | — | 8b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d807 | sí |
| V-A₅ | Vectores | A₅ de TX-2026-000124 | 1e5c24675b6e | 1e5c24675b6e | — | 1e5c24675b6e3934ccd732b0bf284eb78cf0aedbcbab89fed2a3c36aba6ba3bd | sí |
| V-A₅ | Vectores | A₅ de TX-2026-000125 | 04cec0287376 | 04cec0287376 | — | 04cec0287376b1c87b76a2d71be90b4edfdf040a2163efb6c769d370c62c2578 | sí |
| V-A₅ | Vectores | A₅ de TX-2026-000126 | 2677629033a1 | 2677629033a1 | — | 2677629033a1a5460e4d9217111938fe7d761ca3f731e44b1a2798d08a403c26 | sí |
| V-A₅ | Vectores | A₅ de TX-2026-000127 | 778cecc59f93 | 778cecc59f93 | — | 778cecc59f9322639f1e481bca3bf6367402d3ea0ca16b27b18ccf683523d36d | sí |
| 1 | Caso de estudio | Ejecución normal | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = 8b811cdbda03] | sí |
| 2 | Caso de estudio | Alteración de E3 (riesgo 0,12 → 0,92) | INVÁLIDO | INVÁLIDO | V3, V4, V5, V7 | E3: firma inválida (antifraude) [Aₙ = 622da2aa13ef] | sí |
| 3 | Caso de estudio | Eliminación de E3 | INVÁLIDO | INVÁLIDO | V2, V4, V5, V6 | se esperaban 5 eventos y hay 4 [Aₙ = c74e04102168] | sí |
| 4a-r | Caso de estudio | Reentrega idéntica de E3 al registro | IGNORADO | IGNORADO | — | reentrega de un evento ya recibido | sí |
| 4a | Caso de estudio | Reintento legítimo (intentos 1 y 2) | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = 1e5c24675b6e] | sí |
| 4b | Caso de estudio | Duplicación (dos eventos con intento 1) | INVÁLIDO | INVÁLIDO | V6 | RI2: duplicación en op-3 (intento 1) [Aₙ = 2677629033a1] | sí |
| 5a | Caso de estudio | Reverso tras fallo de ejecución | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = 04cec0287376] | sí |
| 5b | Caso de estudio | Reverso sin fallo previo | INVÁLIDO | INVÁLIDO | V6 | transición no permitida: COMPENSACION desde EJECUTADA [Aₙ = 778cecc59f93] | sí |
| 6a | Caso de estudio | Reconstrucción completa sin raíz del testigo | NO_VERIFICABLE | NO_VERIFICABLE | sin evidencia: V1 | no se dispone de la raíz conservada por el testigo externo [Aₙ = 39aceda05560] | sí |
| 6b | Caso de estudio | Reconstrucción completa con raíz del testigo | INVÁLIDO | INVÁLIDO | V1 | el punto de referencia no está incluido en la raíz del testigo [Aₙ = 39aceda05560] | sí |
| C1 | Complementarias | Reordenamiento (E5 antes que E4) | INVÁLIDO | INVÁLIDO | V4, V5, V6 | E5: referencia a un evento posterior (E4) [Aₙ = e7a3f2a7d0c5] | sí |
| C2 | Complementarias | Inserción de un evento firmado con clave ajena | INVÁLIDO | INVÁLIDO | V2, V3, V5, V6 | se esperaban 5 eventos y hay 6 [Aₙ = 2ab1140c4fe0] | sí |
| C3 | Complementarias | Suplantación: E3 firmado por cuentas | INVÁLIDO | INVÁLIDO | V3 | E3: firma inválida (antifraude) [Aₙ = 8b811cdbda03] | sí |
| T1 | Obs. 1 – Testigo externo | Historial íntegro, con raíz del testigo pero sin prueba de inclusión | NO_VERIFICABLE | NO_VERIFICABLE | sin evidencia: V1 | no se dispone de la prueba de inclusión del punto de referencia [Aₙ = 8b811cdbda03] | sí |
| T2 | Obs. 1 – Testigo externo | Historial íntegro, sin punto de referencia (transacción no cerrada) | NO_VERIFICABLE | NO_VERIFICABLE | sin evidencia: V1, V5 | no se dispone del punto de referencia de la transacción; Aₙ = 8b811cdbda03, sin valor comprometido con el que compararlo [Aₙ = 8b811cdbda03] | sí |
| T3 | Obs. 1 – Testigo externo | Historial íntegro, raíz de otro periodo (compromiso inválido) | INVÁLIDO | INVÁLIDO | V1 | el punto de referencia no está incluido en la raíz del testigo [Aₙ = 8b811cdbda03] | sí |
| T4 | Obs. 1 – Testigo externo | Punto de referencia con la firma del registro alterada | INVÁLIDO | INVÁLIDO | V1 | punto de referencia con firma inválida [Aₙ = 8b811cdbda03] | sí |
| T5 | Obs. 1 – Testigo externo | Prueba de inclusión mal formada | INVÁLIDO | INVÁLIDO | V1 | prueba de inclusión mal formada [Aₙ = 8b811cdbda03] | sí |
| T6 | Obs. 1 – Testigo externo | Alteración de E3 sin raíz del testigo: la inconsistencia interna se sigue detectando | INVÁLIDO | INVÁLIDO | V3, V4, V5; sin evidencia: V1 | E3: firma inválida (antifraude) [Aₙ = 622da2aa13ef] | sí |
| D1 | Obs. 2 – RNF-06 | El registro no conserva datos de negocio (32 datos emitidos, 13110 caracteres revisados) | SIN DATOS DE NEGOCIO | SIN DATOS DE NEGOCIO | — | ningún dato ni término de negocio en el contenido del registro | sí |
| D2 | Obs. 2 – RNF-06 | El registro rechaza un evento que incluye el campo data | RECHAZADO | RECHAZADO | — | estructura no conforme: campo no permitido: data | sí |
| D3 | Obs. 2 – RNF-06 | El verificador rechaza un historial con datos de negocio incrustados | INVÁLIDO | INVÁLIDO | V2 | entrada mal formada: registro 1: campo no permitido: data | sí |
| D4 | Obs. 2 – RNF-06 | Ataque por diccionario sobre c de E3 (riesgo de 0,00 a 1,00) | RECUPERADO | RECUPERADO | — | «resultado=aprobada;riesgo=0.12» en 13 intentos | sí |
| I1 | Obs. 3 – Reintentos | Intentos 1, 2 y 3 | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = e9701ef6e34f] | sí |
| I2 | Obs. 3 – Reintentos | Intentos 1 y 3 (falta el 2) | INVÁLIDO | INVÁLIDO | V6 | RI3: falta el intento 2 de op-3 [Aₙ = 0b9979edfed2] | sí |
| I3 | Obs. 3 – Reintentos | Primer y único intento con número 9 | INVÁLIDO | INVÁLIDO | V6 | RI3: la numeración de op-3 empieza en 9 [Aₙ = 630944e7553b] | sí |
| I4 | Obs. 3 – Reintentos | Dos eventos con intento 1 y distinto contenido | INVÁLIDO | INVÁLIDO | V6 | RI2: duplicación en op-3 (intento 1); RI4: resultado inconsistente entre los intentos de op-3 [Aₙ = 6b0d1729bf70] | sí |
| I5 | Obs. 3 – Reintentos | Intentos 1 y 2 con resultados distintos | INVÁLIDO | INVÁLIDO | V6 | RI4: resultado inconsistente entre los intentos de op-3 [Aₙ = 7c410449abdf] | sí |
| I6 | Obs. 3 – Reintentos | Intento 2 registrado antes que el 1 (entrega desordenada) | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = 592ffaa34b3a] | sí |
| I7 | Obs. 3 – Reintentos | Intento 2 emitido por otro servicio | INVÁLIDO | INVÁLIDO | V6 | RI1: intentos de op-3 emitidos por servicios distintos [Aₙ = 24049cc6b598] | sí |
| X1 | Obs. 4 – Robustez | Registro: evento de un emisor que no está en el directorio | RECHAZADO | RECHAZADO | — | emisor no reconocido en el directorio | sí |
| X2 | Obs. 4 – Robustez | Verificador: evento atribuido a un emisor desconocido | INVÁLIDO | INVÁLIDO | V3, V4, V5 | E3: emisor no reconocido en el directorio (pagos-externos) [Aₙ = 5afdf7120be2] | sí |
| X3 | Obs. 4 – Robustez | Árbol de Merkle de un periodo sin transacciones | e3b0c44298fc | e3b0c44298fc | — | MTH({}) = SHA-256() = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (RFC 9162, 2.1.1); prueba de inclusión: no existe (resultado controlado) | sí |
| X4 | Obs. 4 – Robustez | Registro: referencia causal inexistente | PENDIENTE → RECHAZADO | PENDIENTE → RECHAZADO | — | faltan 1 dependencia(s) causal(es); dependencias no recibidas dentro del plazo | sí |
| X5 | Obs. 4 – Robustez | Verificador: E4 con una referencia causal inexistente | INVÁLIDO | INVÁLIDO | V4, V5 | E4: referencia causal inexistente (321cae896052); E5: referencia causal inexistente (14eb39d997e6) [Aₙ = 943faf3c8bc7] | sí |
| X6 | Obs. 4 – Robustez | Firma inválida (un byte alterado) | INVÁLIDO | INVÁLIDO | V3 | E3: firma inválida (antifraude) [Aₙ = 8b811cdbda03] | sí |
| X7 | Obs. 4 – Robustez | Firma mal formada (10 bytes) | INVÁLIDO | INVÁLIDO | V3 | E3: firma mal formada (antifraude) [Aₙ = 8b811cdbda03] | sí |
| X8 | Obs. 4 – Robustez | Registro: firma mal formada | RECHAZADO | RECHAZADO | — | firma mal formada | sí |
| X9 | Obs. 4 – Robustez | Verificador: evento mal formado (intento 0, referencia de 5 bytes, t vacío) | INVÁLIDO | INVÁLIDO | V2 | entrada mal formada: registro 4: el campo t debe ser un texto no vacío | sí |
| X10 | Obs. 4 – Robustez | Registro: evento mal formado (intento 0) | RECHAZADO | RECHAZADO | — | estructura no conforme: el número de intento debe ser un entero mayor o igual que 1 | sí |
| X11 | Obs. 4 – Robustez | Verificador: historial que no es una lista | INVÁLIDO | INVÁLIDO | V2; sin evidencia: V1 | entrada mal formada: el historial no es una lista | sí |
| X12 | Obs. 4 – Robustez | Registro: cierre de una transacción desconocida | ERROR CONTROLADO | ERROR CONTROLADO | — | transacción TX-2026-999999 desconocida | sí |
| O1 | Obs. 7 – Fuera de orden | E4 llega antes que E3: queda pendiente y se acepta al llegar E3 | PENDIENTE → ACEPTADO | PENDIENTE → ACEPTADO | — | faltan 1 dependencia(s) causal(es); al llegar E3 se liberan: E4 | sí |
| O2 | Obs. 7 – Fuera de orden | Transacción con E4 recibido fuera de orden, una vez anclada | VÁLIDO | VÁLIDO | — | todas las comprobaciones se cumplen [Aₙ = 6c4a12471176] | sí |
| O3 | Obs. 7 – Fuera de orden | E3 no llega: el registro no permite cerrar la transacción mientras haya pendientes | ERROR CONTROLADO | ERROR CONTROLADO | — | hay eventos pendientes de dependencias: E4, E5 | sí |
| O4 | Obs. 7 – Fuera de orden | E3 no llega: E4 y E5 vencen y se notifican como incidencia | E4, E5 | E4, E5 | — | incidencias por plazo: E4, E5 (plazo 5 recepciones, cola máx. 100) | sí |
| O5 | Obs. 7 – Fuera de orden | Transacción incompleta (sin E3) verificada tras su cierre | INVÁLIDO | INVÁLIDO | V6 | estado final no alcanzado (EN_VALIDACION) [Aₙ = d6638ca665a5] | sí |
