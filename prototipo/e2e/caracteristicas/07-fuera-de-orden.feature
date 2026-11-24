# language: es
@tabla-13 @supuesto-S4
Característica: Eventos que llegan antes que sus dependencias (pruebas O)
  Como operador del registro
  quiero que un evento que llega antes que sus dependencias espere sin entrar en la cadena
  y que se descarte y se notifique si el plazo vence.

  @O1 @O2 @RF-04
  Escenario: O1 y O2 · E4 llega antes que E3, queda pendiente y la transacción se verifica después
    Dado que la saga "TX-2026-000210" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden "E1, E2, E4, E3, E5"
    Y el registro cierra "TX-2026-000210" y ancla el periodo "P2" en el testigo
    Cuando el auditor verifica "TX-2026-000210" con la raíz del testigo
    Entonces el registro respondió "PENDIENTE" al evento "E4"
    Y al llegar "E3" el registro aceptó también "E4"
    Y el resultado es "VÁLIDO"

  @O3 @O4 @O5
  Escenario: O3, O4 y O5 · E3 no llega nunca
    Dado que la saga "TX-2026-000211" emite los eventos:
      | e   | servicio    | tipo            | clave | intento | depende de | datos                                              |
      | E1  | orquestador | INICIO          | op-1  | 1       |            | origen=0001;destino=0002;importe=500000;moneda=EUR |
      | E2  | cuentas     | FONDOS_OK       | op-2  | 1       | E1         | resultado=ok;saldo_suficiente=si                   |
      | E3  | antifraude  | AUTORIZACION_OK | op-3  | 1       | E1         | resultado=aprobada;riesgo=0.12                     |
      | E4  | cuentas     | EJECUCION_OK    | op-4  | 1       | E2, E3     | debito=0001;abono=0002;importe=500000;resultado=ok |
      | E5  | orquestador | CONFIRMACION    | op-5  | 1       | E4         | estado=confirmada                                  |
    Y el registro de evidencias los recibe en el orden "E1, E2, E4, E5"
    Cuando el registro intenta cerrar "TX-2026-000211"
    Entonces el cierre termina con un error controlado
    Cuando pasa el plazo de espera sin que llegue la dependencia
    Entonces el registro notificó como incidencia por plazo los eventos "E4, E5"
    Cuando el registro cierra "TX-2026-000211" y ancla el periodo "P2" en el testigo
    Y el auditor verifica "TX-2026-000211" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V6"
