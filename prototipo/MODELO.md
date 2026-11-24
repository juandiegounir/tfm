# Del modelo al código

Este documento acompaña al apartado 4.3 del trabajo. Para cada ecuación del modelo indica qué función del prototipo la implementa, cómo lo hace paso a paso, en qué componente y paso del marco se usa y qué prueba la comprueba. Al final relaciona cada línea del pseudocódigo de los algoritmos 1 a 4 (apartado 4.4.1) con el código que la ejecuta. La tabla 10 del trabajo (apartado 4.5.2) resume esta correspondencia.

Todo el código está en [`src/marco.ts`](src/marco.ts). Los valores concretos del caso de estudio no se calculan aquí: los obtiene y comprueba la prueba ejecutable del ejemplo resuelto, [`e2e/caracteristicas/08-ejemplo-resuelto.feature`](e2e/caracteristicas/08-ejemplo-resuelto.feature), cuyos pasos ([`e2e/pasos/ejemplo.ts`](e2e/pasos/ejemplo.ts)) recalculan cada valor intermedio sin usar `marco.ts`. La implementación independiente en Python ([`../python/marco.py`](../python/marco.py)) sigue el mismo orden.

| Ecuación o elemento | Implementación | Se usa en | Se comprueba en |
|---|---|---|---|
| 1. Evento E | [`EventoVerificable`](src/marco.ts#L44-L58), [`validarEvento`](src/marco.ts#L80-L103) | Algoritmo 1 (emisión), algoritmo 2 (forma), V2 | D2, D3, X9, X10 |
| 2. Codificación canónica C(E) | [`C`](src/marco.ts#L69-L73) con [`u32, L, enc`](src/marco.ts#L29-L37) | d(E) | Ejemplo resuelto 4.3.2; vectores TS–Python |
| 3. Resumen d(E) | [`d`](src/marco.ts#L74-L75) | Referencias P, firma (ec. 6), cadena (ec. 5), algoritmo 2, V3, V4 | Ejemplo resuelto 4.3.2 |
| Autómata M (tabla 9) | [`paso, FINAL`](src/marco.ts#L500-L527) | V6 | 4b, 5a, 5b, O5 |
| 4 y 5. Cadena A₀ … Aₙ | [`A0, acc`](src/marco.ts#L76-L78) | Algoritmo 2 (acumulación), V5 | Ejemplo resuelto 4.3.4; escenarios 2, 3 y C1 |
| 6. Firma σᵢ | [`firmar`](src/marco.ts#L118-L119), [`comprobarFirma`](src/marco.ts#L127-L141) | Algoritmo 1, algoritmo 2, V3 (y V1 para σ_R) | C3, X1, X2, X6–X8 |
| 7. Registro Rᵢ | [`Registro`](src/marco.ts#L66-L67) | Historial del registro (algoritmo 2) | Ejemplo resuelto 4.3.4 |
| 8. Punto de referencia K_t | [`PuntoReferencia`](src/marco.ts#L194-L200), [`cuerpo`](src/marco.ts#L201-L203), [`Kbytes`](src/marco.ts#L204-L205) | Algoritmo 3 (cierre), V1 | Ejemplo resuelto 4.3.5; T2, T4 |
| 9 y 10. Raíz MTH y prueba de inclusión | [`MTH`](src/marco.ts#L404-L413), [`ruta`](src/marco.ts#L420-L427), [`comprobarInclusion`](src/marco.ts#L434-L449) | Algoritmo 3 (anclaje), testigo, V1 | Ejemplo resuelto 4.3.5 y 4.3.6; 6b, T1, T3, T5, X3 |
| Reglas RI1–RI5 (apartado 4.3.7) | [`reglasReintento`](src/marco.ts#L529-L564) | V6 | 4a, 4b, I1–I7 |
| Algoritmo 4 | [`verificar`](src/marco.ts#L606-L626), [`cerrarInforme`](src/marco.ts#L783-L800) | Auditor (etapa 5) | Todas las pruebas |

<a id="ecuaciones-1-a-3"></a>
## Ecuaciones 1 a 3: evento, codificación canónica y resumen

```
E    = (t, e, s, τ, k, a, P, c)                                   (1)
C(E) = L(t) || L(e) || L(s) || L(τ) || L(k) || L(a) || L(ord(P)) || L(c)   (2)
d(E) = H(«EVT» || C(E))                                           (3)
```

**Código.** El evento es la interfaz [`EventoVerificable`](src/marco.ts#L44-L58): ocho campos de solo lectura, con `tau` para τ. [`validarEvento`](src/marco.ts#L80-L103) comprueba que un objeto tiene exactamente esos ocho campos y de qué tipo; cualquier campo de más, como `data`, se rechaza (RNF-06). La codificación es la función [`C`](src/marco.ts#L69-L73), apoyada en [u32, L y enc](src/marco.ts#L29-L37):

1. `u32(n)` escribe n como entero sin signo de 4 bytes, el más significativo primero.
2. `L(x)` antepone a x su longitud con `u32`: es la L de la ecuación 2.
3. `enc(x)` pasa los textos y el número de intento a bytes UTF-8 (el intento 1 se codifica como el texto «1»).
4. Para P, `C` ordena los resúmenes con `Buffer.compare` (orden lexicográfico, de modo que no importa en qué orden los enumere el servicio) y antepone su número con `u32`: es ord(P).
5. `C` aplica `L` a los ocho campos y los concatena con `cat` en el orden de la ecuación.

El resumen [`d`](src/marco.ts#L74-L75) antepone el prefijo de dominio «EVT» a C(E) y aplica `H` (SHA-256).

**Dónde se usa.** d(E) es el valor que conecta todo el marco:

- el servicio emisor lo firma al emitir el evento ([algoritmo 1](src/marco.ts#L160-L186));
- los eventos posteriores lo citan en su conjunto P como referencia causal;
- el registro lo calcula al recibir el evento para detectar reentregas, comprobar la firma y las dependencias y acumularlo en la cadena ([algoritmo 2](src/marco.ts#L269-L320));
- el verificador lo recalcula en V3 para comprobar las firmas ([V3](src/marco.ts#L707-L717)) y en V4 para buscar las referencias ([V4](src/marco.ts#L718-L734)).

**Comprobación.** El escenario «4.3.2 · Codificación canónica y resumen del evento E1» del ejemplo resuelto comprueba L(x) de cada campo, los 106 bytes de C(E1) y d(E1). La comparación con Python (`../python/vectores.py`) comprueba que otra implementación obtiene los mismos bytes (RNF-01).

<a id="automata-y-grafo-causal"></a>
## Grafo causal y autómata M (apartado 4.3.3, tabla 9)

**Grafo causal.** G_t no se construye como estructura: lo definen los conjuntos P. El registro exige que cada referencia de P corresponda a un evento ya registrado antes de incorporarlo ([supuesto S4](src/marco.ts#L296-L311)), y el verificador comprueba en [V4](src/marco.ts#L718-L734) que cada referencia apunta a un evento anterior del historial; si no existe, es una eliminación, y si es posterior, un reordenamiento.

**Autómata.** La función de transición δ es [`paso`](src/marco.ts#L500-L527). Su estado es un par: el estado de la tabla 9 y las validaciones ya recibidas, para aceptar FONDOS_OK y AUTORIZACION_OK en cualquier orden. Devuelve el estado siguiente o `null` si la transición no está en la tabla; el conjunto `FINAL` contiene RECHAZADA, COMPENSADA y CONFIRMADA. El verificador lo recorre en [V6](src/marco.ts#L745-L766): una sola transición por clave de operación (los reintentos se agrupan, RI5) y, al final, exige un estado final.

**Comprobación.** 5a y 4a recorren el autómata hasta COMPENSADA y CONFIRMADA; 5b (COMPENSACION desde EJECUTADA) y O5 (estado final no alcanzado) lo hacen fallar.

<a id="ecuaciones-4-y-5"></a>
## Ecuaciones 4 y 5: cadena de acumulación

```
A₀ = H(«INI» || t)                       (4)
Aᵢ = H(«ACU» || Aᵢ₋₁ || d(Eᵢ))           (5)
```

**Código.** [`A0 y acc`](src/marco.ts#L76-L78): dos líneas, una por ecuación.

**Dónde se usa.**

- **Registro** ([algoritmo 2, acumulación](src/marco.ts#L313-L319)): la primera vez que ve una transacción crea su historial con `A: A0(t)`; cada evento aceptado actualiza `hist.A = acc(hist.A, dg)` y guarda la terna (E, σ, A) en `hist.R`. Así, Aₙ es el último valor de la cadena, el que firma el cierre.
- **Verificador** ([V5](src/marco.ts#L735-L744)): recalcula la cadena desde `A0(t)` sobre el historial recibido con `ev.reduce((a, E) => acc(a, d(E)), …)` y la compara con el Aₙ de K_t.

**Comprobación.** El escenario «4.3.4 · Cadena de acumulación de la ejecución normal» comprueba, fila a fila, que cada Aᵢ guardado por el registro es `acc(Aᵢ₋₁, d(Eᵢ))`. El escenario «4.3.4 · Efecto de una manipulación…» comprueba que alterar o eliminar E3 cambia el valor acumulado y que el orden inverso de E2 y E3 da otro valor igualmente válido. Los escenarios 2, 3 y C1 hacen fallar V5.

<a id="ecuaciones-6-y-7"></a>
## Ecuaciones 6 y 7: firma y registro

```
σᵢ = Firma(sk_sᵢ, d(Eᵢ))     (6)
Rᵢ = (Eᵢ, σᵢ, Aᵢ)            (7)
```

**Código.** [`firmar`](src/marco.ts#L118-L119) firma con Ed25519 (`node:crypto`), que es determinista. [`comprobarFirma`](src/marco.ts#L127-L141) busca la clave pública del servicio en el directorio (supuesto S5) y devuelve VÁLIDA, INVÁLIDA, MAL_FORMADA (no tiene 64 bytes) o CLAVE_DESCONOCIDA, para que el motivo del rechazo sea preciso. Rᵢ es el tipo [`Registro`](src/marco.ts#L66-L67).

**Dónde se usa.** El servicio firma en [emitir](src/marco.ts#L160-L186) (algoritmo 1); el registro comprueba la firma antes de aceptar el evento ([algoritmo 2, firma](src/marco.ts#L290-L292)); el verificador la vuelve a comprobar en [V3](src/marco.ts#L707-L717). La misma función firma el punto de referencia (σ_R, ecuación 8).

**Comprobación.** C3 (suplantación), X1 y X2 (emisor desconocido), X6 (firma alterada), X7 y X8 (firma mal formada); el ejemplo resuelto comprueba σ₁ con la clave pública del orquestador.

<a id="ecuacion-8"></a>
## Ecuación 8: punto de referencia

```
K_t = (t, n, Aₙ, σ_R)        (8)
```

**Código.** [`PuntoReferencia`](src/marco.ts#L194-L200) es la cuaterna; [`cuerpo`](src/marco.ts#L201-L203) codifica con L la parte firmada (t, n, Aₙ) y [`Kbytes`](src/marco.ts#L204-L205) añade L(σ_R): esos bytes son la hoja del árbol de la ecuación 9.

**Dónde se usa.** El registro lo emite en [`cerrar`](src/marco.ts#L360-L376) (algoritmo 3, primera parte): no cierra una transacción desconocida ni una con eventos en espera, y firma `cuerpo(t, n, Aₙ)` con su clave. El verificador comprueba esa firma al principio de [V1](src/marco.ts#L633-L674).

**Comprobación.** El escenario «4.3.5 · Firma de E1 y punto de referencia» comprueba el cuerpo de 59 bytes, σ_R y los 127 bytes de K_t; T2 (sin K_t) y T4 (firma de K_t alterada).

<a id="ecuaciones-9-y-10"></a>
## Ecuaciones 9 y 10: raíz del periodo y prueba de inclusión

```
Raíz_p = MTH(K_t₁, …, K_tₘ)                                (9)
MTH(D) = H(0x01 || MTH(x₁, …, xₖ) || MTH(xₖ₊₁, …, xₘ))      (10)
```

**Código.** [hoja, nodo y corte](src/marco.ts#L397-L403): `hoja` antepone 0x00, `nodo` antepone 0x01 y `corte(m)` calcula k, la mayor potencia de dos menor que m. [`MTH`](src/marco.ts#L404-L413) aplica la recursión de la ecuación 10 (y H() para la lista vacía, RFC 9162). [`ruta`](src/marco.ts#L420-L427) genera la prueba de inclusión: los resúmenes hermanos del camino de la hoja i hasta la raíz, con el lado en que está cada uno. [`comprobarInclusion`](src/marco.ts#L434-L449) recorre la prueba desde `hoja(K_t)` encadenando cada hermano con `nodo` y compara el resultado con la raíz.

**Dónde se usa.** [`anclarPeriodo`](src/marco.ts#L471-L497) (algoritmo 3, segunda parte) cierra las transacciones del periodo, calcula `MTH` sobre sus `Kbytes`, entrega la raíz al [`Testigo`](src/marco.ts#L451-L463), que no admite sobrescribirla, y guarda la prueba de cada transacción. El verificador la comprueba en [V1](src/marco.ts#L633-L674).

**Comprobación.** Los escenarios «4.3.5 · Árbol de Merkle…» (hojas, nodos internos, raíz y prueba) y «4.3.6 · Verificación paso a paso…» (recorrido x₀ … x₃); 6b, T1, T3 y T5; X3 (periodo vacío).

<a id="reintentos"></a>
## Reglas de reintento RI1–RI5 (apartado 4.3.7)

[`reglasReintento`](src/marco.ts#L529-L564) agrupa los eventos por clave de operación k y aplica RI1 (mismo servicio), RI2 (sin números de intento repetidos), RI3 (numeración 1, 2, …, m) y RI4 (mismo tipo y mismo resumen c). RI5 se aplica en [V6](src/marco.ts#L745-L766), que hace una sola transición del autómata por clave. Se comprueban con 4a, 4b e I1–I7.

<a id="algoritmos"></a>
## Algoritmos 1 a 4: del pseudocódigo al código

### Algoritmo 1. EmitirEvento → [`ServicioEmisor.emitir`](src/marco.ts#L160-L186)

| Pseudocódigo | Código |
|---|---|
| `c ← H(datos)` | `const c = H(Buffer.from(datos, 'utf8'))` |
| `E ← (t, e, s, τ, k, a, P, c)` | `const E = Object.freeze({ t, e, s: this.nombre, tau, k, a, P: …, c })`; los datos no forman parte de E |
| conservar datos en el almacenamiento local | `` this.almacenLocal.set(`${t}/${e}`, datos) `` |
| `σ ← Firma(sk_s, d(E))` y devolver (E, σ) | `return Object.freeze({ E, sigma: firmar(this.sk, d(E)) })` |

### Algoritmo 2. RegistrarEvento → [`RegistroEvidencias.registrar`](src/marco.ts#L247-L261) y [`evaluar`](src/marco.ts#L269-L320)

| Pseudocódigo | Código |
|---|---|
| E no tiene exactamente los campos de la ecuación 1 → RECHAZADO | [`marco.ts` L270–272](src/marco.ts#L270-L272) |
| E.t está cerrada → RECHAZADO | [`marco.ts` L274–276](src/marco.ts#L274-L276) |
| mismo identificador: IGNORADO si d(E′) = d(E), ANOMALÍA si no | [`marco.ts` L277–289](src/marco.ts#L277-L289) |
| firma no válida → RECHAZADO | [`marco.ts` L290–292](src/marco.ts#L290-L292) |
| alguna referencia de P sin registrar → en espera (PENDIENTE) | [`marco.ts` L296–311](src/marco.ts#L296-L311) |
| Aᵢ ← H(«ACU» ‖ Aᵢ₋₁ ‖ d(E)); añadir (E, σ, A) → ACEPTADO | [`marco.ts` L313–319](src/marco.ts#L313-L319) |
| volver a evaluar los eventos en espera | [`liberarPendientes`](src/marco.ts#L322-L339) |
| vencer los que superan el plazo y notificarlos | [`expirarPendientes`](src/marco.ts#L341-L350) |

### Algoritmo 3. CerrarTransacción y CerrarPeriodo → [`cerrar`](src/marco.ts#L360-L376) y [`anclarPeriodo`](src/marco.ts#L471-L497)

| Pseudocódigo | Código |
|---|---|
| eventos de t en espera → ERROR | `cerrar`: `pendientesDe(t)` |
| K_t ← (t, n, Aₙ, Firma(sk_R, (t, n, Aₙ))) | `cerrar`: `firmar(this.skRegistro, cuerpo(t, n, h.A))` |
| Raíz_p ← MTH(K_t₁, …, K_tₘ) | `anclarPeriodo`: `MTH(hojas)` |
| entregar Raíz_p al testigo | `anclarPeriodo`: `testigo.anclar(periodo, raiz)` |
| guardar la prueba de inclusión de cada K_t | `anclarPeriodo`: `ruta(hojas, i)` |

### Algoritmo 4. Verificar → [`verificar`](src/marco.ts#L606-L626)

| Pseudocódigo | Código |
|---|---|
| V1: firma de K_t e inclusión en Raíz_p | [`marco.ts` L633–674](src/marco.ts#L633-L674) |
| V2: forma, transacción, identificadores únicos, n = K_t.n | [`marco.ts` L675–706](src/marco.ts#L675-L706) |
| V3: emisor en el directorio y firma de cada d(Eᵢ) | [`marco.ts` L707–717](src/marco.ts#L707-L717) |
| V4: cada referencia apunta a un evento anterior | [`marco.ts` L718–734](src/marco.ts#L718-L734) |
| V5: Aₙ recalculado = K_t.Aₙ | [`marco.ts` L735–744](src/marco.ts#L735-L744) |
| V6: reglas RI1–RI5 y autómata M hasta un estado final | [`marco.ts` L745–766](src/marco.ts#L745-L766) |
| V7: H(datos) = c, si se aportan los datos | [`marco.ts` L767–779](src/marco.ts#L767-L779) |
| resultado: INVÁLIDO, NO_VERIFICABLE o VÁLIDO | [`cerrarInforme`](src/marco.ts#L783-L800) |

`verificar` envuelve todo en un `try`: cualquier excepción inesperada se convierte en INVÁLIDO en V2, de modo que ninguna entrada termina en un error sin controlar.
