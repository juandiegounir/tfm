# language: es
@ejemplo-resuelto @RNF-01 @RNF-02
Característica: Ejemplo resuelto del caso de estudio (apartados 4.3.2 a 4.3.6)
  Como lector del trabajo
  quiero que el ejemplo resuelto de TX-2026-000123 se calcule con el prototipo y se compruebe valor a valor
  para no depender de cálculos hechos a mano y poder reproducir cada resultado intermedio.

  El periodo P1 agrupa las cinco transacciones del caso de estudio (escenarios 1, 4a, 4b, 5a y 5b),
  con los datos, las claves de demostración y el orden de entrega con los que se publican los valores.

  Antecedentes:
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
    Y el registro cierra "TX-2026-000123, TX-2026-000124, TX-2026-000125, TX-2026-000126, TX-2026-000127" y ancla el periodo "P1" en el testigo

  @apartado-4.3.2 @ecuación-2 @ecuación-3
  Escenario: 4.3.2 · Codificación canónica y resumen del evento E1
    Entonces el resumen c de los datos del evento "E1" de "TX-2026-000123" es "ce1066d356c757012b3b2c2fe029a5a93326914b305511f87b1841e122d49e47"
    Y la codificación canónica C(E1) de "TX-2026-000123" tiene 106 bytes con estos campos:
      | campo | valor                                                            | bytes | L(x)                                                                     |
      | t     | TX-2026-000123                                                   | 18    | 0000000e54582d323032362d303030313233                                     |
      | e     | E1                                                               | 6     | 000000024531                                                             |
      | s     | orquestador                                                      | 15    | 0000000b6f72717565737461646f72                                          |
      | τ     | INICIO                                                           | 10    | 00000006494e4943494f                                                     |
      | k     | op-1                                                             | 8     | 000000046f702d31                                                         |
      | a     | 1                                                                | 5     | 0000000131                                                               |
      | P     | ∅                                                                | 8     | 0000000400000000                                                         |
      | c     | resumen de los datos                                             | 36    | 00000020ce1066d356c757012b3b2c2fe029a5a93326914b305511f87b1841e122d49e47 |
    Y la entrada «EVT» || C(E1) tiene 109 bytes
    Y el resumen d(E1) de "TX-2026-000123" es "ef95dee9015803df2266eb9bf35c272ae8005afd5ee2d83670b989fc75e20b5d"

  @apartado-4.3.4 @ecuación-4 @ecuación-5
  Escenario: 4.3.4 · Cadena de acumulación de la ejecución normal
    Entonces la cadena de acumulación de "TX-2026-000123" es:
      | i | evento | d(Eᵢ)                                                            | Aᵢ                                                               |
      | 0 | —      | —                                                                | de3182924a3b4e4007e80cf48ba1b95ac68dec8e984a0e5f74f508a22873edea |
      | 1 | E1     | ef95dee9015803df2266eb9bf35c272ae8005afd5ee2d83670b989fc75e20b5d | 23f6881e92edba68e2865a3dad0c2fc424bb0fd005d9d973f28d4eca0819250e |
      | 2 | E2     | c004de1737d7f4fd81abc293c48cdd1cf0dd3af2e8a0c5c751e567f4d8e2aadd | ed4e6def6993374ad9d0478224b8ec629031a6aebc699d7f4f3bc7b5bf5e2f3c |
      | 3 | E3     | 41b4cc9180d66a803b3274d14a01b4ef5fc75b6ffdcd59881bf92f649ab9286e | a0ac93dd37fe856ac04d0193af52cd215c4ffc96ce17e293fb973c721acb99e1 |
      | 4 | E4     | 14eb39d997e6bbab65caf7198867ca26ec30366d99ccc003b33945e85faf6873 | 92d809c5126e19e4b7df675a2457d3e0e99d3905ff7c2aa674492c9e5ac24037 |
      | 5 | E5     | 991f7bad5de9cbc331a8213fd617bf82c7c1cf5fdf4b5481be8ce83069b17131 | 8b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d807 |

  @apartado-4.3.4
  Escenario: 4.3.4 · Efecto de una manipulación y de otro orden válido sobre la cadena
    Entonces con los datos "resultado=aprobada;riesgo=0.92" en "E3" de "TX-2026-000123", d(E3) empieza por "92544493a4d7" y el valor acumulado recalculado por "622da2aa13ef"
    Y sin el evento "E3" de "TX-2026-000123", el valor acumulado de los cuatro restantes empieza por "c74e04102168"
    Y con "E2" y "E3" de "TX-2026-000123" registrados en orden inverso, el valor acumulado empieza por "f06cedbc3be8"

  @apartado-4.3.5 @ecuación-6 @ecuación-8
  Escenario: 4.3.5 · Firma de E1 y punto de referencia de la transacción
    Entonces la clave pública del servicio "orquestador" empieza por "e7a2e082848ba34f"
    Y la firma σ del evento "E1" de "TX-2026-000123" empieza por "c8da718fa7265f96" y es válida con esa clave
    Y el cuerpo firmado del punto de referencia de "TX-2026-000123" tiene 59 bytes
    Y la firma σ_R del punto de referencia de "TX-2026-000123" es "cbad839b04072af5cf49be7be8f7140a2fa6e7d8e0f28076e015a2b9f9a003446e9f41b28f8e20ceab06a0507f3357bcece97a8fe635269c5b33fa8532b1130e"
    Y el punto de referencia K_t de "TX-2026-000123" ocupa 127 bytes y es "0000000e54582d323032362d3030303132330000000135000000208b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d80700000040cbad839b04072af5cf49be7be8f7140a2fa6e7d8e0f28076e015a2b9f9a003446e9f41b28f8e20ceab06a0507f3357bcece97a8fe635269c5b33fa8532b1130e"

  @apartado-4.3.5 @ecuación-9 @ecuación-10
  Escenario: 4.3.5 · Árbol de Merkle del periodo P1 y prueba de inclusión
    Entonces las hojas del árbol del periodo "P1" son:
      | transacción    | hᵢ                                                               |
      | TX-2026-000123 | cb5fbb8304dbffd94fac5a6f2fddc3a5d6160100f376425b6c140003353667c1 |
      | TX-2026-000124 | 48fb9062c5852f379fa8df61ca39ede8e18277290a4e0141a9e807337df59353 |
      | TX-2026-000125 | 13eb2a2455e07e52137a19911c124ad6b26bb9e99c889b89d67dc70ccf7f0feb |
      | TX-2026-000126 | 3a9c5e20e0380b9c061772ee278db92914f65d6d8131234c7a49f776d9fe5495 |
      | TX-2026-000127 | 2a33458b76de9c64fef7267ded3e2aa39f6417b783aee702744131c518c281bd |
    Y los nodos internos del periodo "P1" son:
      | nodo | hojas | valor                                                            |
      | n₁₂  | 1-2   | 825294f273efa10c2abdfdd5d23872b51370374dc0d6ceca1d350db24f77c66b |
      | n₃₄  | 3-4   | 85142280fbb4711cf2ea7dd938e6cf9dadb3c5dc84d715ab5f6d40efd057be6e |
      | n₁₋₄ | 1-4   | 9ce7a13ca6f1ce7beadfe7c684f28c25fe6465887a0b2561b187df5eccb63672 |
    Y la raíz que conserva el testigo para "P1" es "b968809d7fd6ad3d3f88d79a1a2d5efca2dbc8c02890f8fe5d43607095187c60"
    Y la prueba de inclusión de "TX-2026-000123" está formada por:
      | hermano | lado      | resumen                                                          |
      | h₂      | derecha   | 48fb9062c5852f379fa8df61ca39ede8e18277290a4e0141a9e807337df59353 |
      | n₃₄     | derecha   | 85142280fbb4711cf2ea7dd938e6cf9dadb3c5dc84d715ab5f6d40efd057be6e |
      | h₅      | derecha   | 2a33458b76de9c64fef7267ded3e2aa39f6417b783aee702744131c518c281bd |

  @apartado-4.3.6 @algoritmo-4
  Escenario: 4.3.6 · Verificación paso a paso de la transacción de referencia
    Cuando el auditor verifica "TX-2026-000123" con la raíz del testigo
    Entonces al recorrer la prueba de inclusión de "TX-2026-000123" se obtiene:
      | x  | valor                                                            |
      | x₀ | cb5fbb8304dbffd94fac5a6f2fddc3a5d6160100f376425b6c140003353667c1 |
      | x₁ | 825294f273efa10c2abdfdd5d23872b51370374dc0d6ceca1d350db24f77c66b |
      | x₂ | 9ce7a13ca6f1ce7beadfe7c684f28c25fe6465887a0b2561b187df5eccb63672 |
      | x₃ | b968809d7fd6ad3d3f88d79a1a2d5efca2dbc8c02890f8fe5d43607095187c60 |
    Y los pasos del verificador terminan así:
      | paso | estado    | detalle contiene  |
      | V1   | CORRECTO  | incluido          |
      | V2   | CORRECTO  |                   |
      | V3   | CORRECTO  |                   |
      | V4   | CORRECTO  |                   |
      | V5   | CORRECTO  | 8b811cdbda03      |
      | V6   | CORRECTO  | CONFIRMADA        |
    Y el resultado es "VÁLIDO"

  @valores-publicados @anexo-B
  Escenario: Valores acumulados finales publicados en el anexo B
    Entonces el valor acumulado final de cada transacción es:
      | transacción    | A₅                                                               |
      | TX-2026-000123 | 8b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d807 |
      | TX-2026-000124 | 1e5c24675b6e3934ccd732b0bf284eb78cf0aedbcbab89fed2a3c36aba6ba3bd |
      | TX-2026-000125 | 04cec0287376b1c87b76a2d71be90b4edfdf040a2163efb6c769d370c62c2578 |
      | TX-2026-000126 | 2677629033a1a5460e4d9217111938fe7d761ca3f731e44b1a2798d08a403c26 |
      | TX-2026-000127 | 778cecc59f9322639f1e481bca3bf6367402d3ea0ca16b27b18ccf683523d36d |
