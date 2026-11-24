# language: es
@tabla-13
Característica: Respuesta ante entradas inválidas (pruebas X)
  Como operador del registro y como auditor
  quiero que ninguna entrada inválida provoque una excepción sin controlar
  y que cada una se rechace con un motivo.

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

  @X1 @RF-06
  Escenario: X1 · El registro rechaza un emisor que no está en el directorio
    Cuando el servicio "pagos-externos", que no figura en el directorio, envía al registro el evento "E1" de "TX-2026-000220"
    Entonces el registro responde "RECHAZADO"

  @X2 @RF-06
  Escenario: X2 · El verificador rechaza un evento atribuido a un emisor desconocido
    Cuando el atacante atribuye el evento "E3" de "TX-2026-000123" al servicio "pagos-externos"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3, V4, V5"

  @X3
  Escenario: X3 · Árbol de Merkle de un periodo sin transacciones
    Cuando se calcula la raíz de un periodo vacío
    Entonces la raíz es "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    Y no existe prueba de inclusión para ese periodo

  @X4 @supuesto-S4
  Escenario: X4 · El registro deja en espera una referencia causal inexistente y la descarta al vencer el plazo
    Cuando el servicio "cuentas" envía al registro un evento "E4" de "TX-2026-000221" que depende de un resumen inexistente
    Y pasa el plazo de espera sin que llegue la dependencia
    Entonces el registro respondió "PENDIENTE" y después notificó "RECHAZADO" para el evento "E4"

  @X5 @RF-04
  Escenario: X5 · El verificador rechaza una referencia causal inexistente
    Cuando el atacante sustituye el evento "E4" de "TX-2026-000123" por uno firmado que depende de un resumen inexistente
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V4, V5"

  @X6 @RF-06
  Escenario: X6 · Firma inválida con un byte alterado
    Cuando el atacante altera un byte de la firma del evento "E3" de "TX-2026-000123"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3"

  @X7 @RF-06
  Escenario: X7 · Firma mal formada en el historial
    Cuando el atacante sustituye la firma del evento "E3" de "TX-2026-000123" por 10 bytes
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V3"

  @X8
  Escenario: X8 · El registro rechaza una firma mal formada
    Cuando el servicio "orquestador" envía al registro el evento "E1" de "TX-2026-000123" con una firma de 10 bytes
    Entonces el registro responde "RECHAZADO"

  @X9
  Escenario: X9 · El verificador rechaza un evento mal formado
    Cuando el atacante deja el evento "E4" de "TX-2026-000123" con intento 0, una referencia de 5 bytes y la transacción vacía
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V2"

  @X10
  Escenario: X10 · El registro rechaza un evento mal formado
    Cuando el servicio "orquestador" envía al registro el evento "E1" de "TX-2026-000123" con intento 0
    Entonces el registro responde "RECHAZADO"

  @X11
  Escenario: X11 · El verificador recibe un historial que no es una lista
    Cuando el auditor verifica "TX-2026-000123" con un historial que no es una lista
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V2"

  @X12
  Escenario: X12 · El registro no cierra una transacción desconocida
    Cuando el registro intenta cerrar "TX-2026-999999"
    Entonces el cierre termina con un error controlado
