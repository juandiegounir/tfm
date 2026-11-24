# language: es
@tabla-13 @RF-03 @supuesto-S3
Característica: Disponibilidad del compromiso externo (pruebas T)
  Como auditor
  quiero que la verificación distinga la falta de una evidencia de una inconsistencia
  para no dar por VÁLIDO un historial que no puedo comparar con la raíz del testigo.

  Antecedentes:
    Dado que la saga "TX-2026-000123" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000123" y ancla el periodo "P1" en el testigo

  @T1
  Escenario: T1 · Historial íntegro sin la prueba de inclusión
    Cuando el auditor verifica "TX-2026-000123" sin la prueba de inclusión
    Entonces el resultado es "NO_VERIFICABLE"
    Y el paso "V1" queda sin evidencia

  @T2
  Escenario: T2 · Historial íntegro sin punto de referencia
    Cuando el auditor verifica "TX-2026-000123" sin punto de referencia ni raíz
    Entonces el resultado es "NO_VERIFICABLE"
    Y el paso "V1" queda sin evidencia

  @T3
  Escenario: T3 · Raíz de otro periodo
    Cuando el auditor verifica "TX-2026-000123" con la raíz de otro periodo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V1"

  @T4
  Escenario: T4 · Punto de referencia con la firma del registro alterada
    Cuando el atacante altera un byte de la firma del punto de referencia de "TX-2026-000123"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V1"

  @T5
  Escenario: T5 · Prueba de inclusión mal formada
    Cuando el auditor verifica "TX-2026-000123" con una prueba de inclusión mal formada
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V1"

  @T6 @amenaza-alteración
  Escenario: T6 · Alteración detectada aunque falte el testigo
    Cuando el atacante cambia los datos del evento "E3" de "TX-2026-000123" a "resultado=aprobada;riesgo=0.92"
    Y el auditor verifica "TX-2026-000123" sin la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3, V4, V5"
