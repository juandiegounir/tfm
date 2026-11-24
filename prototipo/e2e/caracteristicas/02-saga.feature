# language: es
@tabla-12 @RF-05
Característica: Reintentos y reversos de la saga
  Como auditor
  quiero que la verificación acepte los reintentos y reversos legítimos de la saga
  y rechace las duplicaciones y los reversos sin fallo previo.

  @escenario-4a @RF-01
  Escenario: 4a · Reintento legítimo tras un fallo de comunicación
    Dado que la saga "TX-2026-000124" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3b | antifraude  | AUTORIZACION_OK | op-3  | 2       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3b    | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden "E1, E2, E3, E3, E3b, E4, E5"
    Y el registro cierra "TX-2026-000124" y ancla el periodo "P1" en el testigo
    Cuando el auditor verifica "TX-2026-000124" con la raíz del testigo
    Entonces el registro respondió "IGNORADO" a la reentrega del evento "E3"
    Y el resultado es "VÁLIDO"

  @escenario-4b @amenaza-duplicación
  Escenario: 4b · Duplicación de un evento
    Dado que la saga "TX-2026-000126" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E3d | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000126" y ancla el periodo "P1" en el testigo
    Cuando el auditor verifica "TX-2026-000126" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
    Y el verificador señala la regla "RI2"

  @escenario-5a
  Escenario: 5a · Reverso tras un fallo de ejecución
    Dado que la saga "TX-2026-000125" emite los eventos:
      | e  | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1 | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2 | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;retencion=500000                      |
      | E3 | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4 | cuentas     | EJECUCION_FALLO | op-4  | 1       | E2, E3     | abono=rechazado_por_entidad_destino                |
      | E5 | cuentas     | COMPENSACION    | op-6  | 1       | E2, E4     | liberacion_retencion=500000                        |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000125" y ancla el periodo "P1" en el testigo
    Cuando el auditor verifica "TX-2026-000125" con la raíz del testigo
    Entonces el resultado es "VÁLIDO"

  @escenario-5b @amenaza-reverso-indebido
  Escenario: 5b · Reverso sin fallo previo
    Dado que la saga "TX-2026-000127" emite los eventos:
      | e  | servicio    | tipo            | clave | intento | depende de | datos                                |
      | E1 | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2 | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;retencion=500000        |
      | E3 | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12       |
      | E4 | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;resultado=ok  |
      | E5 | cuentas     | COMPENSACION    | op-6  | 1       | E2, E4     | liberacion_retencion=500000          |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000127" y ancla el periodo "P1" en el testigo
    Cuando el auditor verifica "TX-2026-000127" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
