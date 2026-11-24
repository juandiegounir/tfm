# language: es
@tabla-12
Característica: Detección de manipulaciones del historial de una transferencia
  Como auditor de una entidad financiera
  quiero verificar el historial de una transferencia frente a la raíz que conserva el testigo externo
  para saber si alguien alteró, eliminó, reordenó, insertó o suplantó sus eventos.

  Cada escenario recorre el marco de extremo a extremo: los servicios emiten y firman los eventos
  (algoritmo 1), el registro de evidencias los acepta (algoritmo 2), cierra la transacción y ancla
  el periodo en el testigo (algoritmo 3), el atacante actúa sobre el historial conservado y el
  auditor ejecuta el verificador (algoritmo 4).

  Antecedentes:
    Dado que la saga "TX-2026-000123" emite los eventos:
      | e  | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1 | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2 | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3 | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4 | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5 | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden de emisión
    Y el registro cierra "TX-2026-000123" y ancla el periodo "P1" en el testigo

  @escenario-1 @RF-01 @RF-02
  Escenario: 1 · Ejecución normal
    Cuando el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "VÁLIDO"

  @escenario-2 @RF-02 @amenaza-alteración
  Escenario: 2 · Alteración del contenido de un evento
    Cuando el atacante cambia los datos del evento "E3" de "TX-2026-000123" a "resultado=aprobada;riesgo=0.92"
    Y el servicio "antifraude" aporta al auditor los datos originales del evento "E3"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3, V4, V5, V7"

  @escenario-3 @RF-04 @amenaza-eliminación
  Escenario: 3 · Eliminación de un evento intermedio
    Cuando el atacante elimina el evento "E3" de "TX-2026-000123"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V2, V4, V5, V6"

  @escenario-6a @RF-03 @amenaza-reconstrucción @supuesto-S3
  Escenario: 6a · Reconstrucción completa del historial sin la raíz del testigo
    Cuando el atacante, con el control del registro y las claves de todos los servicios, reconstruye "TX-2026-000123" con los datos del evento "E3" cambiados a "resultado=aprobada;riesgo=0.92"
    Y el auditor verifica el historial reconstruido sin la raíz del testigo
    Entonces el resultado es "NO_VERIFICABLE"
    Y el paso "V1" queda sin evidencia

  @escenario-6b @RF-03 @amenaza-reconstrucción @supuesto-S3
  Escenario: 6b · Reconstrucción completa del historial con la raíz del testigo
    Cuando el atacante, con el control del registro y las claves de todos los servicios, reconstruye "TX-2026-000123" con los datos del evento "E3" cambiados a "resultado=aprobada;riesgo=0.92"
    Y el auditor verifica el historial reconstruido con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V1"

  @complementaria @RF-04 @amenaza-reordenamiento
  Escenario: C1 · Reordenamiento de dos eventos dependientes
    Cuando el atacante intercambia los eventos "E4" y "E5" de "TX-2026-000123"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V4, V5, V6"

  @complementaria @RF-06 @amenaza-inserción
  Escenario: C2 · Inserción de un evento firmado con una clave ajena
    Cuando el atacante inserta en "TX-2026-000123" un evento "E6" del servicio "antifraude" firmado con una clave ajena
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V2, V3, V5, V6"

  @complementaria @RF-06 @amenaza-suplantación
  Escenario: C3 · Suplantación de un servicio por otro
    Cuando el atacante vuelve a firmar el evento "E3" de "TX-2026-000123" con la clave del servicio "cuentas"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3"
