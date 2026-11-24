/**
 * Mundo de las pruebas de extremo a extremo. Cada escenario empieza con un registro de evidencias,
 * un testigo y unos servicios nuevos, de modo que los escenarios son independientes entre sí.
 * Las claves son las de demostración del prototipo: H(«clave-demo-» || servicio).
 */
import { After, Before, World, setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';
import {
  Anclaje,
  Bytes,
  Directorio,
  EvidenciaFirmada,
  Informe,
  PuntoReferencia,
  Registro,
  RegistroEvidencias,
  Respuesta,
  ServicioEmisor,
  Testigo,
  claveDemo,
  crearDirectorio,
} from '../../src/marco.ts';
import type { KeyObject } from 'node:crypto';

export const SERVICIOS = ['orquestador', 'cuentas', 'antifraude'];

export class Mundo extends World {
  sk: Record<string, KeyObject> = Object.fromEntries(
    [...SERVICIOS, 'registro'].map(s => [s, claveDemo(s)]),
  );
  dir: Directorio = crearDirectorio(this.sk);
  servicios = new Map<string, ServicioEmisor>(
    SERVICIOS.map(s => [s, new ServicioEmisor(s, this.sk[s])]),
  );
  registro = new RegistroEvidencias(this.dir, this.sk.registro);
  testigo = new Testigo();

  /** Evidencias emitidas por transacción, en orden de emisión. */
  emitidas = new Map<string, Map<string, EvidenciaFirmada>>();
  datosEmitidos: string[] = [];
  ultimaTx = '';
  /** Respuestas del registro por transacción, en orden de entrega. */
  respuestas = new Map<string, (Respuesta & { e: string })[]>();
  ultimaRespuesta?: Respuesta;
  anclajes = new Map<string, Anclaje>();
  periodoDe = new Map<string, string>();
  /** Transacciones de cada periodo, en el orden de sus hojas en el árbol de Merkle. */
  txsPeriodo = new Map<string, string[]>();
  /** Historial conservado tal como lo verá el auditor (el atacante puede modificarlo). */
  historiales = new Map<string, Registro[]>();
  K = new Map<string, PuntoReferencia>();
  datosAportados: Record<string, string> = {};
  reconstruido?: { historial: Registro[]; K: PuntoReferencia; t: string };
  informe?: Informe;
  cierre?: { ok: boolean; motivo?: string };
  raizVacia?: Bytes;
  pruebaVacia?: unknown;
  diccionario?: { recuperado?: string; intentos: number };

  servicio(nombre: string): ServicioEmisor {
    if (!this.servicios.has(nombre))
      this.servicios.set(nombre, new ServicioEmisor(nombre, claveDemo(nombre)));
    return this.servicios.get(nombre)!;
  }
  /** Historial conservado de t: la primera vez se copia del registro. */
  historial(t: string): Registro[] {
    if (!this.historiales.has(t))
      this.historiales.set(
        t,
        this.registro.historial(t).map(r => [...r] as Registro),
      );
    return this.historiales.get(t)!;
  }
  posicion(t: string, e: string): number {
    const i = this.historial(t).findIndex(r => r[0].e === e);
    if (i < 0) throw new Error(`el evento ${e} no está en el historial de ${t}`);
    return i;
  }
}
setWorldConstructor(Mundo);
setDefaultTimeout(20_000);

Before(function (this: Mundo) {
  /* el constructor ya crea un mundo nuevo por escenario */
});

/** Adjunta al informe el detalle de cada paso del verificador. */
After(function (this: Mundo) {
  if (!this.informe) return;
  const filas = this.informe.pasos.map(p => `${p.id.padEnd(3)} ${p.estado.padEnd(13)} ${p.detalle}`);
  this.attach(
    [`Resultado: ${this.informe.resultado} (paso ${this.informe.paso}): ${this.informe.motivo}`, ...filas].join('\n'),
    'text/plain',
  );
});
