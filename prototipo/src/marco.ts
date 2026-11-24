/**
 * Prototipo de referencia del marco en TypeScript elaborado con la asistencia de Claude Code.
 * (Node.js 22, sin dependencias externas; SHA-256 y Ed25519 de node:crypto).
 *
 * Componentes: servicio emisor (algoritmo 1), registro de evidencias (algoritmos 2 y 3),
 * testigo externo (raíz MTH de RFC 9162) y verificador (algoritmo 4, pasos V1–V7).
 *  - El verificador devuelve VÁLIDO, INVÁLIDO o NO_VERIFICABLE (apartado 4.3.6).
 *  - El evento verificable no contiene los datos de negocio, que se conservan en el
 *    servicio emisor; el registro rechaza cualquier campo adicional (RNF-06).
 *  - V6 aplica las reglas de reintento RI1–RI5 del apartado 4.3.7 (RF-05).
 *  - Las entradas mal formadas producen resultados controlados, no excepciones.
 *  - El registro deja en espera, con plazo y cola acotados, los eventos que llegan
 *    antes que sus dependencias causales.
 */
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  KeyObject,
} from 'node:crypto';

// ---------- utilidades ----------
export type Bytes = Buffer;
/** Función hash H (SHA-256). */
export const H = (b: Bytes): Bytes => createHash('sha256').update(b).digest();
export const cat = (...p: Bytes[]): Bytes => Buffer.concat(p);
const u32 = (n: number): Bytes => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
/** L(x): antepone la longitud de x en cuatro bytes. */
const L = (b: Bytes): Bytes => cat(u32(b.length), b);
const enc = (x: string | number | Bytes): Bytes =>
  Buffer.isBuffer(x) ? x : Buffer.from(String(x), 'utf8');
export const hex = (b: Bytes, n = 64) => b.toString('hex').slice(0, n);
export const eq = (a: Bytes, b: Bytes) => a.length === b.length && a.equals(b);
const esResumen = (x: unknown): x is Bytes => Buffer.isBuffer(x) && x.length === 32;
const LONG_FIRMA = 64; // bytes de una firma Ed25519 (RFC 8032)

// ---------- modelo (ecuaciones 1-5) ----------
/**
 * Evento verificable E = (t, e, s, τ, k, a, P, c), ecuación 1.
 * Es lo único que sale del servicio emisor: c es el resumen de los datos de negocio,
 * que no forman parte de la evidencia (RNF-06).
 */
export interface EventoVerificable {
  readonly t: string; // identificador de la transacción
  readonly e: string; // identificador del evento
  readonly s: string; // servicio emisor
  readonly tau: string; // tipo de evento (τ)
  readonly k: string; // clave de operación
  readonly a: number; // número de intento
  readonly P: readonly Bytes[]; // resúmenes de los eventos de los que depende
  readonly c: Bytes; // resumen de los datos de negocio
}
const CAMPOS = ['t', 'e', 's', 'tau', 'k', 'a', 'P', 'c'] as const;

/** Evidencia firmada que el servicio entrega al registro: (E, σ). */
export interface EvidenciaFirmada {
  readonly E: EventoVerificable;
  readonly sigma: Bytes;
}
/** Registro Rᵢ = (Eᵢ, σᵢ, Aᵢ) que conserva el registro de evidencias, ecuación 7. */
export type Registro = [EventoVerificable, Bytes, Bytes];

/** Codificación canónica C(E), ecuación 2. */
export function C(E: EventoVerificable): Bytes {
  const refs = cat(u32(E.P.length), ...[...E.P].sort((x, y) => Buffer.compare(x, y)));
  return cat(...[E.t, E.e, E.s, E.tau, E.k, E.a].map(f => L(enc(f))), L(refs), L(E.c));
}
/** Resumen del evento d(E), ecuación 3. */
export const d = (E: EventoVerificable) => H(cat(Buffer.from('EVT'), C(E)));
/** Valor inicial A₀ y acumulación Aᵢ, ecuaciones 4 y 5. */
export const A0 = (t: string) => H(cat(Buffer.from('INI'), Buffer.from(t)));
export const acc = (prev: Bytes, dg: Bytes) => H(cat(Buffer.from('ACU'), prev, dg));

/**
 * Comprueba que un objeto tiene exactamente la forma de un evento verificable.
 * Devuelve null si es conforme o el motivo por el que no lo es.
 */
export function validarEvento(x: unknown): string | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x))
    return 'el evento no es un objeto';
  const o = x as Record<string, unknown>;
  const extra = Object.keys(o).filter(c => !(CAMPOS as readonly string[]).includes(c));
  if (extra.length) return `campo no permitido: ${extra.join(', ')}`;
  for (const c of CAMPOS) if (!(c in o)) return `falta el campo ${c}`;
  for (const c of ['t', 'e', 's', 'tau', 'k'] as const)
    if (typeof o[c] !== 'string' || o[c].length === 0)
      return `el campo ${c} debe ser un texto no vacío`;
  if (typeof o.a !== 'number' || !Number.isInteger(o.a) || o.a < 1)
    return 'el número de intento debe ser un entero mayor o igual que 1';
  if (!Array.isArray(o.P) || !o.P.every(esResumen))
    return 'P debe ser una lista de resúmenes de 32 bytes';
  const P = o.P;
  if (new Set(P.map(p => p.toString('hex'))).size !== P.length)
    return 'P contiene referencias repetidas';
  if (!esResumen(o.c)) return 'c debe ser un resumen de 32 bytes';
  return null;
}

// ---------- claves de demostración y directorio ----------
const PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex');
/** Clave Ed25519 de demostración: semilla H(«clave-demo-» || nombre). */
export const claveDemo = (nombre: string): KeyObject =>
  createPrivateKey({
    key: cat(PKCS8, H(Buffer.from('clave-demo-' + nombre))),
    format: 'der',
    type: 'pkcs8',
  });
/** Directorio de claves públicas: servicio → clave pública confiable. */
export type Directorio = ReadonlyMap<string, KeyObject>;
export const crearDirectorio = (sk: Record<string, KeyObject>): Directorio =>
  new Map(Object.entries(sk).map(([s, k]) => [s, createPublicKey(k)]));
/** Firma Ed25519 σ = Firma(sk, m), ecuación 6 (y σ_R de la ecuación 8). Ed25519 es determinista. */
export const firmar = (k: KeyObject, m: Bytes) => sign(null, m, k);

/**
 * Comprobación de una firma de la ecuación 6 con la clave pública del directorio (supuesto S5).
 * Distingue las causas de fallo para que el registro y el verificador informen del motivo.
 */
export type ComprobacionFirma =
  'VÁLIDA' | 'CLAVE_DESCONOCIDA' | 'MAL_FORMADA' | 'INVÁLIDA';
export function comprobarFirma(
  dir: Directorio,
  s: string,
  m: Bytes,
  sigma: unknown,
): ComprobacionFirma {
  const pk = dir.get(s);
  if (!pk) return 'CLAVE_DESCONOCIDA';
  if (!Buffer.isBuffer(sigma) || sigma.length !== LONG_FIRMA) return 'MAL_FORMADA';
  try {
    return verify(null, m, pk, sigma) ? 'VÁLIDA' : 'INVÁLIDA';
  } catch {
    return 'MAL_FORMADA';
  }
}
const TEXTO_FIRMA: Record<Exclude<ComprobacionFirma, 'VÁLIDA'>, string> = {
  CLAVE_DESCONOCIDA: 'emisor no reconocido en el directorio',
  MAL_FORMADA: 'firma mal formada',
  INVÁLIDA: 'firma inválida',
};

// ---------- servicio emisor (algoritmo 1) ----------
/**
 * Servicio emisor. Conserva localmente los datos de negocio de cada evento y entrega
 * al exterior solo la evidencia firmada, que contiene su resumen c = H(datos).
 */
export class ServicioEmisor {
  private readonly almacenLocal = new Map<string, string>(); // "t/e" → datos de negocio
  constructor(
    readonly nombre: string,
    private readonly sk: KeyObject,
  ) {}

  /**
   * Algoritmo 1. Emite el evento de la ecuación 1: calcula c = H(datos), forma E sin los datos
   * de negocio, lo firma (ecuación 6) y conserva los datos en el almacenamiento local.
   */
  emitir(
    t: string,
    e: string,
    tau: string,
    k: string,
    a: number,
    P: Bytes[],
    datos: string,
  ): EvidenciaFirmada {
    const c = H(Buffer.from(datos, 'utf8')); // el resumen se calcula dentro del servicio
    const E: EventoVerificable = Object.freeze({
      t,
      e,
      s: this.nombre,
      tau,
      k,
      a,
      P: Object.freeze([...P]),
      c,
    });
    this.almacenLocal.set(`${t}/${e}`, datos);
    return Object.freeze({ E, sigma: firmar(this.sk, d(E)) });
  }
  /** Datos de negocio de un evento, para la comprobación V7 que solicite un auditor autorizado. */
  datos(t: string, e: string): string | undefined {
    return this.almacenLocal.get(`${t}/${e}`);
  }
}

// ---------- registro de evidencias (algoritmos 2 y 3) ----------
/** Punto de referencia K_t = (t, n, Aₙ, σ_R), ecuación 8. */
export interface PuntoReferencia {
  t: string;
  n: number;
  A: Bytes;
  sigR: Bytes;
}
/** Cuerpo firmado del punto de referencia: L(t) || L(n) || L(Aₙ). */
export const cuerpo = (t: string, n: number, A: Bytes) =>
  cat(L(Buffer.from(t)), L(Buffer.from(String(n))), L(A));
/** K_t codificado: cuerpo || L(σ_R). Es la hoja del árbol de Merkle del periodo (ecuación 9). */
export const Kbytes = (K: PuntoReferencia) => cat(cuerpo(K.t, K.n, K.A), L(K.sigR));

export type EstadoRecepcion =
  'ACEPTADO' | 'IGNORADO' | 'PENDIENTE' | 'RECHAZADO' | 'ANOMALÍA';
export interface Respuesta {
  estado: EstadoRecepcion;
  motivo: string;
  e?: string;
  /** Eventos en espera que se aceptaron al llegar este. */
  liberados?: string[];
}
export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: string };

/** Plazo de espera de un evento pendiente, en recepciones (reloj lógico, reproducible). */
export const PLAZO_PENDIENTE = 5;
/** Tamaño máximo de la cola de pendientes: evita esperas y consumo de memoria ilimitados. */
export const MAX_PENDIENTES = 100;

interface Historial {
  R: Registro[];
  A: Bytes;
  ids: Map<string, Bytes>;
}
interface Pendiente {
  ev: EvidenciaFirmada;
  dg: Bytes;
  vence: number;
}

export class RegistroEvidencias {
  private readonly tx = new Map<string, Historial>();
  private readonly cerradas = new Map<string, PuntoReferencia>();
  private pendientes: Pendiente[] = [];
  private reloj = 0;
  /** Incidencias asíncronas: eventos pendientes que vencieron sin recibir sus dependencias. */
  readonly incidencias: Respuesta[] = [];

  constructor(
    private readonly dir: Directorio,
    private readonly skRegistro: KeyObject,
  ) {}

  /**
   * Algoritmo 2: recepción de una evidencia firmada. Nunca lanza excepciones: devuelve ACEPTADO,
   * IGNORADO, PENDIENTE, RECHAZADO o ANOMALÍA con su motivo. Si acepta el evento, incorpora los
   * que esperaban por él y vence los pendientes caducados.
   */
  registrar(E: unknown, sigma: unknown): Respuesta {
    this.reloj++;
    const r = this.evaluar(E, sigma, true);
    if (r.estado === 'ACEPTADO') {
      const lib = this.liberarPendientes();
      if (lib.length) r.liberados = lib;
    }
    this.expirarPendientes();
    return r;
  }

  /** Simula el paso del tiempo sin recepciones (para las pruebas de vencimiento). */
  avanzarReloj(n: number): void {
    this.reloj += n;
    this.expirarPendientes();
  }

  private evaluar(E: unknown, sigma: unknown, puedeEsperar: boolean): Respuesta {
    // Algoritmo 2: E debe tener exactamente los campos de la ecuación 1 (RNF-06)
    const mal = validarEvento(E);
    if (mal) return { estado: 'RECHAZADO', motivo: `estructura no conforme: ${mal}` };
    const ev = E as EventoVerificable;
    // la transacción no debe estar cerrada
    if (this.cerradas.has(ev.t))
      return { estado: 'RECHAZADO', motivo: 'transacción cerrada', e: ev.e };
    const dg = d(ev); // ecuación 3
    // mismo identificador: reentrega idéntica (IGNORADO) o contenido distinto (ANOMALÍA)
    const previo =
      this.tx.get(ev.t)?.ids.get(ev.e) ??
      this.pendientes.find(p => p.ev.E.t === ev.t && p.ev.E.e === ev.e)?.dg;
    if (previo)
      return eq(previo, dg)
        ? { estado: 'IGNORADO', motivo: 'reentrega de un evento ya recibido', e: ev.e }
        : {
            estado: 'ANOMALÍA',
            motivo: 'mismo identificador con distinto contenido',
            e: ev.e,
          };
    // firma del emisor sobre d(E) con su clave del directorio (ecuación 6)
    const f = comprobarFirma(this.dir, ev.s, dg, sigma);
    if (f !== 'VÁLIDA') return { estado: 'RECHAZADO', motivo: TEXTO_FIRMA[f], e: ev.e };

    const h = this.tx.get(ev.t);
    const conocidos = h ? h.R.map(r => d(r[0])) : [];
    // supuesto S4: todas las referencias de P deben estar ya registradas; si no, el evento espera
    const faltan = ev.P.filter(p => !conocidos.some(k => eq(k, p))).length;
    if (faltan) {
      if (!puedeEsperar) return { estado: 'PENDIENTE', motivo: '', e: ev.e };
      if (this.pendientes.length >= MAX_PENDIENTES)
        return { estado: 'RECHAZADO', motivo: 'cola de pendientes llena', e: ev.e };
      this.pendientes.push({
        ev: { E: ev, sigma: sigma as Bytes },
        dg,
        vence: this.reloj + PLAZO_PENDIENTE,
      });
      return {
        estado: 'PENDIENTE',
        motivo: `faltan ${faltan} dependencia(s) causal(es)`,
        e: ev.e,
      };
    }
    // acumulación: A₀ (ecuación 4) para el primer evento y Aᵢ = acc(Aᵢ₋₁, d(Eᵢ)) (ecuación 5)
    const hist: Historial = h ?? { R: [], A: A0(ev.t), ids: new Map() };
    if (!h) this.tx.set(ev.t, hist);
    hist.A = acc(hist.A, dg);
    hist.R.push([ev, sigma as Bytes, hist.A]);
    hist.ids.set(ev.e, dg);
    return { estado: 'ACEPTADO', motivo: 'evidencia incorporada', e: ev.e };
  }

  /** Vuelve a evaluar los pendientes hasta que ninguno pueda aceptarse. */
  private liberarPendientes(): string[] {
    const lib: string[] = [];
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const p of [...this.pendientes]) {
        this.pendientes = this.pendientes.filter(x => x !== p);
        const r = this.evaluar(p.ev.E, p.ev.sigma, false);
        if (r.estado === 'ACEPTADO') {
          lib.push(p.ev.E.e);
          cambio = true;
        } else if (r.estado === 'PENDIENTE') this.pendientes.push(p);
        else this.incidencias.push(r);
      }
    }
    return lib;
  }

  private expirarPendientes(): void {
    const vencidos = this.pendientes.filter(p => p.vence < this.reloj);
    this.pendientes = this.pendientes.filter(p => p.vence >= this.reloj);
    for (const p of vencidos)
      this.incidencias.push({
        estado: 'RECHAZADO',
        motivo: 'dependencias no recibidas dentro del plazo',
        e: p.ev.E.e,
      });
  }

  pendientesDe(t: string): string[] {
    return this.pendientes.filter(p => p.ev.E.t === t).map(p => p.ev.E.e);
  }

  historial(t: string): Registro[] {
    return (this.tx.get(t)?.R ?? []).map(r => [...r] as Registro);
  }

  /** Algoritmo 3 (primera parte): cierre de la transacción y emisión de su punto de referencia K_t. */
  cerrar(t: string): Resultado<PuntoReferencia> {
    const previo = this.cerradas.get(t);
    if (previo) return { ok: true, valor: previo };
    const h = this.tx.get(t);
    if (!h) return { ok: false, motivo: `transacción ${t} desconocida` };
    const pend = this.pendientesDe(t);
    if (pend.length)
      return {
        ok: false,
        motivo: `hay eventos pendientes de dependencias: ${pend.join(', ')}`,
      };
    const n = h.R.length;
    const K = { t, n, A: h.A, sigR: firmar(this.skRegistro, cuerpo(t, n, h.A)) };
    this.cerradas.set(t, K);
    return { ok: true, valor: K };
  }

  /** Todo lo que el registro conserva, serializado (para comprobar RNF-06). */
  volcado(): string {
    const ser = (x: unknown): unknown =>
      Buffer.isBuffer(x)
        ? x.toString('hex')
        : Array.isArray(x)
          ? x.map(ser)
          : x && typeof x === 'object'
            ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, ser(v)]))
            : x;
    return JSON.stringify({
      historiales: [...this.tx].map(([t, h]) => ({ t, R: ser(h.R) })),
      cerradas: ser([...this.cerradas.values()]),
      pendientes: ser(this.pendientes.map(p => p.ev)),
    });
  }
}

// ---------- testigo externo: MTH de RFC 9162 (ecuaciones 9 y 10) ----------
const hoja = (b: Bytes) => H(cat(Buffer.from([0]), b));
const nodo = (l: Bytes, r: Bytes) => H(cat(Buffer.from([1]), l, r));
const corte = (n: number) => {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
};
/**
 * Raíz de Merkle MTH, ecuaciones 9 y 10. Para la lista vacía, RFC 9162 (2.1.1)
 * define MTH({}) = SHA-256().
 */
export function MTH(D: readonly Bytes[]): Bytes {
  if (D.length === 0) return H(Buffer.alloc(0));
  if (D.length === 1) return hoja(D[0]);
  const k = corte(D.length);
  return nodo(MTH(D.slice(0, k)), MTH(D.slice(k)));
}
export type Prueba = { izq: boolean; h: Bytes }[];
/** Prueba de inclusión de la hoja i; undefined si el índice no existe. */
export function prueba(D: readonly Bytes[], i: number): Prueba | undefined {
  if (!Number.isInteger(i) || i < 0 || i >= D.length) return undefined;
  return ruta(D, i);
}
/** Camino de la hoja i hasta la raíz (RFC 9162, apartado 2.1.3); i es un índice válido. */
function ruta(D: readonly Bytes[], i: number): Prueba {
  if (D.length === 1) return [];
  const k = corte(D.length);
  return i < k
    ? [...ruta(D.slice(0, k), i), { izq: false, h: MTH(D.slice(k)) }]
    : [...ruta(D.slice(k), i - k), { izq: true, h: MTH(D.slice(0, k)) }];
}
const esNodoPrueba = (s: unknown): s is Prueba[number] =>
  typeof s === 'object' &&
  s !== null &&
  typeof (s as { izq?: unknown }).izq === 'boolean' &&
  esResumen((s as { h?: unknown }).h);
export type ComprobacionInclusion = 'INCLUIDO' | 'NO_INCLUIDO' | 'PRUEBA_MAL_FORMADA';
export function comprobarInclusion(
  b: Bytes,
  pr: unknown,
  raiz: Bytes,
): ComprobacionInclusion {
  if (
    !Array.isArray(pr) ||
    !pr.every(esNodoPrueba)
  )
    return 'PRUEBA_MAL_FORMADA';
  const r = pr.reduce(
    (h, s) => (s.izq ? nodo(s.h, h) : nodo(h, s.h)),
    hoja(b),
  );
  return eq(r, raiz) ? 'INCLUIDO' : 'NO_INCLUIDO';
}

/** Testigo externo: conserva una raíz por periodo y no admite sobrescribirla. */
export class Testigo {
  private readonly raices = new Map<string, Bytes>();
  anclar(periodo: string, raiz: Bytes): Resultado<Bytes> {
    if (this.raices.has(periodo))
      return { ok: false, motivo: `el periodo ${periodo} ya está anclado` };
    this.raices.set(periodo, Buffer.from(raiz));
    return { ok: true, valor: raiz };
  }
  raiz(periodo: string): Bytes | undefined {
    return this.raices.get(periodo);
  }
}

export interface Anclaje {
  periodo: string;
  K: Record<string, PuntoReferencia>;
  raiz: Bytes;
  pruebas: Record<string, Prueba>;
}
/** Algoritmo 3 (segunda parte): cierre del periodo y anclaje de su raíz en el testigo. */
export function anclarPeriodo(
  reg: RegistroEvidencias,
  testigo: Testigo,
  periodo: string,
  txs: string[],
): Resultado<Anclaje> {
  const K: Record<string, PuntoReferencia> = {};
  for (const t of txs) {
    const r = reg.cerrar(t);
    if (!r.ok) return r;
    K[t] = r.valor;
  }
  const hojas = txs.map(t => Kbytes(K[t]));
  const raiz = MTH(hojas);
  const a = testigo.anclar(periodo, raiz);
  if (!a.ok) return a;
  return {
    ok: true,
    valor: {
      periodo,
      K,
      raiz,
      pruebas: Object.fromEntries(txs.map((t, i) => [t, ruta(hojas, i)])),
    },
  };
}

// ---------- autómata M (tabla 9) ----------
/**
 * Estado del autómata: estado de la tabla 9 y validaciones ya recibidas, para aceptar
 * FONDOS_OK y AUTORIZACION_OK en cualquier orden. `paso` es la función de transición δ;
 * devuelve null si la transición no está permitida.
 */
type Estado = [string | null, Set<string>];
const FINAL = new Set(['RECHAZADA', 'COMPENSADA', 'CONFIRMADA']);
function paso([q, seen]: Estado, tau: string): Estado | null {
  if (q === null && tau === 'INICIO') return ['INICIADA', seen];
  if (
    (q === 'INICIADA' || q === 'EN_VALIDACION') &&
    (tau === 'FONDOS_OK' || tau === 'AUTORIZACION_OK') &&
    !seen.has(tau)
  ) {
    const s2 = new Set(seen).add(tau);
    return [s2.size === 2 ? 'VALIDADA' : 'EN_VALIDACION', s2];
  }
  if (
    (q === 'INICIADA' || q === 'EN_VALIDACION') &&
    (tau === 'FONDOS_FALLO' || tau === 'AUTORIZACION_RECHAZADA')
  )
    return ['RECHAZADA', seen];
  if (q === 'VALIDADA' && tau === 'EJECUCION_OK') return ['EJECUTADA', seen];
  if (q === 'VALIDADA' && tau === 'EJECUCION_FALLO') return ['COMPENSANDO', seen];
  if (q === 'COMPENSANDO' && tau === 'COMPENSACION') return ['COMPENSADA', seen];
  if (q === 'EJECUTADA' && tau === 'CONFIRMACION') return ['CONFIRMADA', seen];
  return null;
}

/**
 * Reglas de reintento (RF-05, apartado 4.3.7). Para cada clave de operación k, con intentos I_k:
 *  RI1. Todos los intentos los emite el mismo servicio.
 *  RI2. No hay dos eventos con el mismo número de intento (duplicación).
 *  RI3. Los números de intento, ordenados, son exactamente 1, 2, …, m: sin huecos y desde 1.
 *  RI4. Todos los intentos tienen el mismo tipo τ y el mismo resumen c (operación idempotente).
 * El orden de registro entre intentos no se exige: con entrega al menos una vez pueden llegar
 * desordenados. Las reentregas idénticas las descarta antes el registro (mismo e, mismo d(E)).
 * Si se cumplen RI1–RI4, la operación produce una sola transición del autómata (RI5).
 */
export function reglasReintento(ev: readonly EventoVerificable[]): string[] {
  const anom: string[] = [];
  const porClave = new Map<string, EventoVerificable[]>();
  ev.forEach(E => porClave.set(E.k, [...(porClave.get(E.k) ?? []), E]));
  for (const [k, lst] of porClave) {
    if (new Set(lst.map(E => E.s)).size > 1)
      anom.push(`RI1: intentos de ${k} emitidos por servicios distintos`);
    const nums = lst.map(E => E.a).sort((x, y) => x - y);
    const rep = nums.filter((x, i) => i > 0 && x === nums[i - 1]);
    if (rep.length)
      anom.push(`RI2: duplicación en ${k} (intento ${[...new Set(rep)].join(', ')})`);
    const unicos = [...new Set(nums)];
    if (unicos[0] !== 1)
      anom.push(`RI3: la numeración de ${k} empieza en ${unicos[0]}`);
    else {
      const hueco = unicos.findIndex((x, i) => x !== i + 1);
      if (hueco >= 0) anom.push(`RI3: falta el intento ${hueco + 1} de ${k}`);
    }
    if (
      new Set(lst.map(E => E.tau)).size > 1 ||
      new Set(lst.map(E => E.c.toString('hex'))).size > 1
    )
      anom.push(`RI4: resultado inconsistente entre los intentos de ${k}`);
  }
  return anom;
}

// ---------- verificador (algoritmo 4, pasos V1-V7) ----------
export type ResultadoVerificacion = 'VÁLIDO' | 'INVÁLIDO' | 'NO_VERIFICABLE';
/** CORRECTO: la comprobación se cumple. INCORRECTO: se detecta una inconsistencia.
 *  SIN_EVIDENCIA: falta una evidencia indispensable. OMITIDO: no se ejecuta porque la entrada está mal formada. */
export type EstadoPaso = 'CORRECTO' | 'INCORRECTO' | 'SIN_EVIDENCIA' | 'OMITIDO';
export interface PasoVerificacion {
  id: string;
  estado: EstadoPaso;
  detalle: string;
}
export interface EntradaVerificacion {
  historial: readonly unknown[]; // registros (E, σ, A) tal como los entrega el registro
  K?: PuntoReferencia; // punto de referencia K_t
  prueba?: Prueba; // prueba de inclusión de K_t en la raíz del periodo
  raiz?: Bytes; // raíz obtenida del testigo externo
  datos?: Record<string, string>; // datos de negocio aportados por los servicios (V7)
}
export interface Informe {
  resultado: ResultadoVerificacion;
  paso: string;
  motivo: string;
  pasos: PasoVerificacion[];
  A?: Bytes;
}

function validarK(K: unknown): string | null {
  if (typeof K !== 'object' || K === null)
    return 'el punto de referencia no es un objeto';
  const k = K as Record<string, unknown>;
  if (
    typeof k.t !== 'string' ||
    !Number.isInteger(k.n) ||
    (k.n as number) < 0 ||
    !esResumen(k.A) ||
    !Buffer.isBuffer(k.sigR)
  )
    return 'punto de referencia mal formado';
  return null;
}

/**
 * Algoritmo 4. Resultado:
 *  INVÁLIDO       si algún paso detecta una inconsistencia (criptográfica, causal o transaccional);
 *  NO_VERIFICABLE si no hay inconsistencias, pero falta alguna evidencia indispensable
 *                 (punto de referencia, raíz del testigo o prueba de inclusión);
 *  VÁLIDO         si todos los pasos se cumplen con un compromiso externo confiable.
 */
export function verificar(x: EntradaVerificacion, dir: Directorio): Informe {
  try {
    return verificarSinCaptura(x, dir);
  } catch (err) {
    // Defensa final: ninguna entrada debe terminar en una excepción sin controlar.
    const motivo = `entrada mal formada (${(err as Error).message})`;
    return {
      resultado: 'INVÁLIDO',
      paso: 'V2',
      motivo,
      pasos: [{ id: 'V2', estado: 'INCORRECTO', detalle: motivo }],
    };
  }
}

function verificarSinCaptura(x: EntradaVerificacion, dir: Directorio): Informe {
  const pasos: PasoVerificacion[] = [];
  const add = (id: string, estado: EstadoPaso, detalle: string) =>
    pasos.push({ id, estado, detalle });

  // V1: compromiso externo
  const malK = x.K === undefined ? null : validarK(x.K);
  const K = x.K && !malK ? x.K : undefined;
  if (x.K === undefined)
    add(
      'V1',
      'SIN_EVIDENCIA',
      'no se dispone del punto de referencia de la transacción',
    );
  else if (malK) add('V1', 'INCORRECTO', malK);
  else if (K) {
    const f = comprobarFirma(dir, 'registro', cuerpo(K.t, K.n, K.A), K.sigR);
    if (f === 'CLAVE_DESCONOCIDA')
      add('V1', 'SIN_EVIDENCIA', 'el directorio no contiene la clave del registro');
    else if (f !== 'VÁLIDA')
      add('V1', 'INCORRECTO', `punto de referencia con ${TEXTO_FIRMA[f]}`);
    else if (!x.raiz)
      add(
        'V1',
        'SIN_EVIDENCIA',
        'no se dispone de la raíz conservada por el testigo externo',
      );
    else if (!x.prueba)
      add(
        'V1',
        'SIN_EVIDENCIA',
        'no se dispone de la prueba de inclusión del punto de referencia',
      );
    else {
      const inc = comprobarInclusion(Kbytes(K), x.prueba, x.raiz);
      if (inc === 'INCLUIDO')
        add('V1', 'CORRECTO', 'punto de referencia incluido en la raíz del testigo');
      else if (inc === 'NO_INCLUIDO')
        add(
          'V1',
          'INCORRECTO',
          'el punto de referencia no está incluido en la raíz del testigo',
        );
      else add('V1', 'INCORRECTO', 'prueba de inclusión mal formada');
    }
  }

  // V2: forma del historial
  const malos: string[] = [];
  if (!Array.isArray(x.historial)) malos.push('el historial no es una lista');
  else
    x.historial.forEach((r, i) => {
      if (!Array.isArray(r) || r.length !== 3)
        return malos.push(`registro ${i + 1}: no tiene la forma (E, σ, A)`);
      const m = validarEvento(r[0]);
      if (m) malos.push(`registro ${i + 1}: ${m}`);
    });
  if (malos.length) {
    add('V2', 'INCORRECTO', 'entrada mal formada: ' + malos.join('; '));
    for (const id of ['V3', 'V4', 'V5', 'V6', 'V7'])
      add(id, 'OMITIDO', 'no se ejecuta sobre una entrada mal formada');
    return cerrarInforme(pasos);
  }
  const R = x.historial as Registro[];
  const ev = R.map(r => r[0]);
  const t = K?.t ?? ev.at(0)?.t;
  const ids = ev.map(E => E.e);
  const prob2: string[] = [];
  if (!ev.every(E => E.t === t)) prob2.push('hay eventos de otra transacción');
  if (new Set(ids).size !== ids.length)
    prob2.push('identificadores de evento repetidos');
  if (K && ev.length !== K.n)
    prob2.push(`se esperaban ${K.n} eventos y hay ${ev.length}`);
  add(
    'V2',
    prob2.length ? 'INCORRECTO' : 'CORRECTO',
    prob2.join('; ') || 'forma correcta',
  );

  // V3: autenticidad de cada evento
  const prob3 = R.flatMap(([E, s]) => {
    const f = comprobarFirma(dir, E.s, d(E), s);
    return f === 'VÁLIDA' ? [] : [`${E.e}: ${TEXTO_FIRMA[f]} (${E.s})`];
  });
  add(
    'V3',
    prob3.length ? 'INCORRECTO' : 'CORRECTO',
    prob3.join('; ') || 'firmas válidas',
  );

  // V4: dependencias causales
  const dig = ev.map(d);
  const prob4: string[] = [];
  ev.forEach((E, i) => {
    for (const p of E.P) {
      const j = dig.findIndex(y => eq(y, p));
      if (j < 0) prob4.push(`${E.e}: referencia causal inexistente (${hex(p, 12)})`);
      else if (j >= i)
        prob4.push(`${E.e}: referencia a un evento posterior (${ev[j].e})`);
    }
  });
  add(
    'V4',
    prob4.length ? 'INCORRECTO' : 'CORRECTO',
    prob4.join('; ') || 'dependencias respetadas',
  );

  // V5: valor acumulado
  const A = ev.reduce((a, E) => acc(a, d(E)), A0(t ?? ''));
  if (!K)
    add(
      'V5',
      'SIN_EVIDENCIA',
      `Aₙ = ${hex(A, 12)}, sin valor comprometido con el que compararlo`,
    );
  else add('V5', eq(A, K.A) ? 'CORRECTO' : 'INCORRECTO', `Aₙ = ${hex(A, 12)}`);

  // V6: reglas de reintento y autómata M
  const anom = reglasReintento(ev);
  let q: Estado = [null, new Set()];
  const hechas = new Set<string>();
  for (const E of ev) {
    if (hechas.has(E.k)) continue; // una sola transición por clave de operación (RI5)
    hechas.add(E.k);
    const nx = paso(q, E.tau);
    if (!nx) {
      anom.push(`transición no permitida: ${E.tau} desde ${q[0]}`);
      break;
    }
    q = nx;
  }
  if (!anom.length && (q[0] === null || !FINAL.has(q[0])))
    anom.push(`estado final no alcanzado (${q[0]})`);
  add(
    'V6',
    anom.length ? 'INCORRECTO' : 'CORRECTO',
    anom.join('; ') || `estado ${q[0]}`,
  );

  // V7: correspondencia con los datos de negocio (opcional)
  if (x.datos) {
    const dif = Object.entries(x.datos).flatMap(([e, v]) => {
      const E = ev.find(y => y.e === e);
      if (!E) return [`${e} no figura en el historial`];
      return eq(H(Buffer.from(v, 'utf8')), E.c) ? [] : [`contenido distinto en ${e}`];
    });
    add(
      'V7',
      dif.length ? 'INCORRECTO' : 'CORRECTO',
      dif.join('; ') || 'contenido coincide',
    );
  }
  return { ...cerrarInforme(pasos), A };
}

function cerrarInforme(pasos: PasoVerificacion[]): Informe {
  const mal = pasos.find(p => p.estado === 'INCORRECTO');
  if (mal) return { resultado: 'INVÁLIDO', paso: mal.id, motivo: mal.detalle, pasos };
  const falta = pasos.filter(p => p.estado === 'SIN_EVIDENCIA');
  if (falta.length)
    return {
      resultado: 'NO_VERIFICABLE',
      paso: falta[0].id,
      motivo: falta.map(p => p.detalle).join('; '),
      pasos,
    };
  return {
    resultado: 'VÁLIDO',
    paso: '—',
    motivo: 'todas las comprobaciones se cumplen',
    pasos,
  };
}
