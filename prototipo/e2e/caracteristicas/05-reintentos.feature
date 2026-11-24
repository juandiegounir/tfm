# language: es
@tabla-13 @RF-05
Característica: Reglas de reintento RI1 a RI5 (pruebas I)
  Como auditor
  quiero que los intentos de una misma operación se acepten solo si proceden del mismo servicio,
  se numeran desde 1 sin huecos ni repeticiones y producen el mismo resultado.

  @I1 @RF-01
  Escenario: I1 · Intentos 1, 2 y 3
    Dado que la saga "TX-2026-000201" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | antifraude  | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3c | antifraude  | AUTORIZACION_OK | op-3  | 3       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3c    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000201" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000201" con la raíz del testigo
    Entonces el resultado es "VÁLIDO"

  @I2
  Escenario: I2 · Intentos 1 y 3, falta el 2
    Dado que la saga "TX-2026-000202" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3c | antifraude  | AUTORIZACION_OK | op-3  | 3       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3c    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000202" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000202" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI3"

  @I3
  Escenario: I3 · Primer y único intento con número 9
    Dado que la saga "TX-2026-000203" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 9       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000203" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000203" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI3"

  @I4
  Escenario: I4 · Dos eventos con intento 1 y distinto contenido
    Dado que la saga "TX-2026-000204" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3d | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.50                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3d    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000204" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000204" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI2"

  @I5
  Escenario: I5 · Intentos 1 y 2 con resultados distintos
    Dado que la saga "TX-2026-000205" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | antifraude  | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.50                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3b    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000205" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000205" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI4"

  @I6
  Escenario: I6 · Intento 2 registrado antes que el 1
    Dado que la saga "TX-2026-000206" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | antifraude  | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3b    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden "E1, E2, E3b, E3, E4, E5"
    Y el registro cierra "TX-2026-000206" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000206" con la raíz del testigo
    Entonces el resultado es "VÁLIDO"

  @I7
  Escenario: I7 · Intento 2 emitido por otro servicio
    Dado que la saga "TX-2026-000207" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | cuentas     | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3b    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000207" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000207" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI1"
