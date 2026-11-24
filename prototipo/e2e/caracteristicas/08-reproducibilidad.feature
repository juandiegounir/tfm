# language: es
@vectores @RNF-01 @RNF-02
Característica: Reproducibilidad de los valores publicados en el trabajo
  Como lector del trabajo
  quiero reconstruir de extremo a extremo el periodo P1 del caso de estudio
  para comprobar que se obtienen exactamente los valores que publica el trabajo.

  Escenario: Periodo P1 con las cinco transacciones del caso de estudio
    Dado que la saga "TX-2026-000123" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y que la saga "TX-2026-000124" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | antifraude  | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3b    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden "E1, E2, E3, E3, E3b, E4, E5"
    Y que la saga "TX-2026-000125" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;retencion=500000                      |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_FALLO | op-4  | 1       | E2, E3     | abono=rechazado_por_entidad_destino                |
      | E5  | cuentas     | COMPENSACION    | op-6  | 1       | E2, E4     | liberacion_retencion=500000                        |
    Y el registro de evidencias los recibe en el orden de emisión
    Y que la saga "TX-2026-000126" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3d | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y que la saga "TX-2026-000127" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;retencion=500000                      |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;resultado=ok                |
      | E5  | cuentas     | COMPENSACION    | op-6  | 1       | E2, E4     | liberacion_retencion=500000                        |
    Y el registro de evidencias los recibe en el orden de emisión
    Cuando el registro cierra "TX-2026-000123, TX-2026-000124, TX-2026-000125, TX-2026-000126, TX-2026-000127" y ancla el periodo "P1" en el testigo
    Entonces el resumen d(E1) de "TX-2026-000123" es "ef95dee9015803df2266eb9bf35c272ae8005afd5ee2d83670b989fc75e20b5d"
    Y el valor inicial A₀ de "TX-2026-000123" empieza por "de3182924a3b"
    Y el valor acumulado final de cada transacción es:
      | transacción    | A₅                                                               |
      | TX-2026-000123 | 8b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d807 |
      | TX-2026-000124 | 1e5c24675b6e3934ccd732b0bf284eb78cf0aedbcbab89fed2a3c36aba6ba3bd |
      | TX-2026-000125 | 04cec0287376b1c87b76a2d71be90b4edfdf040a2163efb6c769d370c62c2578 |
      | TX-2026-000126 | 2677629033a1a5460e4d9217111938fe7d761ca3f731e44b1a2798d08a403c26 |
      | TX-2026-000127 | 778cecc59f9322639f1e481bca3bf6367402d3ea0ca16b27b18ccf683523d36d |
    Y la raíz que conserva el testigo para "P1" es "b968809d7fd6ad3d3f88d79a1a2d5efca2dbc8c02890f8fe5d43607095187c60"
    Y la prueba de inclusión de "TX-2026-000123" tiene 3 resúmenes
