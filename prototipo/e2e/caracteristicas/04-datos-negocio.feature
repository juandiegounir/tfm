# language: es
@tabla-13 @RNF-06
Característica: Separación entre datos de negocio y evidencias (pruebas D)
  Como responsable de protección de datos
  quiero que el registro de evidencias no conserve los datos financieros
  y que se documente el límite de esa protección.

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

  @D1
  Escenario: D1 · El registro no conserva datos de negocio
    Entonces el contenido completo del registro no incluye ninguno de los datos de negocio emitidos

  @D2
  Escenario: D2 · El registro rechaza un evento con datos de negocio incrustados
    Cuando un servicio envía a un registro nuevo el evento "E1" de "TX-2026-000123" con el campo "data"
    Entonces el registro responde "RECHAZADO"

  @D3
  Escenario: D3 · El verificador rechaza un historial con datos de negocio incrustados
    Cuando el atacante incrusta el campo "data" en el evento "E1" de "TX-2026-000123"
    Y el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces el resultado es "INVÁLIDO"
    Y fallan los pasos "V2"

  @D4 @limitación
  Escenario: D4 · Ataque por diccionario sobre el resumen de un dato predecible
    Cuando el atacante prueba los niveles de riesgo de 0,00 a 1,00 contra el resumen c del evento "E3" de "TX-2026-000123"
    Entonces recupera "resultado=aprobada;riesgo=0.12" en 13 intentos
