/**
 * Exporta los vectores de prueba del caso de estudio (periodo 1) a vectores/vectores.json,
 * para compararlos con implementaciones independientes (RNF-01).
 * Ejecución: npm run vectores
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  A0,
  Bytes,
  C,
  EvidenciaFirmada,
  H,
  Kbytes,
  RegistroEvidencias,
  ServicioEmisor,
  Testigo,
  acc,
  anclarPeriodo,
  claveDemo,
  crearDirectorio,
  d,
  hex,
} from './marco.ts';

const NOMBRES = ['orquestador', 'cuentas', 'antifraude'];
const SK = Object.fromEntries([...NOMBRES, 'registro'].map(s => [s, claveDemo(s)]));
const DIR = crearDirectorio(SK);
const SERV = Object.fromEntries(NOMBRES.map(s => [s, new ServicioEmisor(s, SK[s])]));

type Spec = [string, string, string, string, number, string[], string];
const D_E1 = 'origen=0001;destino=0002;importe=500000;moneda=EUR';
const D_E4 = 'debito=0001;abono=0002;importe=500000;resultado=ok';
const e1: Spec = ['E1', 'orquestador', 'INICIO', 'op-1', 1, [], D_E1];
const e2: Spec = [
  'E2',
  'cuentas',
  'FONDOS_OK',
  'op-2',
  1,
  ['E1'],
  'resultado=ok;saldo_suficiente=si',
];
const e3 = (e = 'E3', a = 1): Spec => [
  e,
  'antifraude',
  'AUTORIZACION_OK',
  'op-3',
  a,
  ['E1'],
  'resultado=aprobada;riesgo=0.12',
];
const e4 = (u = 'E3'): Spec => [
  'E4',
  'cuentas',
  'EJECUCION_OK',
  'op-4',
  1,
  ['E2', u],
  D_E4,
];
const e5: Spec = [
  'E5',
  'orquestador',
  'CONFIRMACION',
  'op-5',
  1,
  ['E4'],
  'estado=confirmada',
];
const rev = (indebido: boolean): Spec[] => [
  e1,
  ['E2', 'cuentas', 'FONDOS_OK', 'op-2', 1, ['E1'], 'resultado=ok;retencion=500000'],
  e3(),
  indebido
    ? [
        'E4',
        'cuentas',
        'EJECUCION_OK',
        'op-4',
        1,
        ['E2', 'E3'],
        'debito=0001;abono=0002;resultado=ok',
      ]
    : [
        'E4',
        'cuentas',
        'EJECUCION_FALLO',
        'op-4',
        1,
        ['E2', 'E3'],
        'abono=rechazado_por_entidad_destino',
      ],
  [
    'E5',
    'cuentas',
    'COMPENSACION',
    'op-6',
    1,
    ['E2', 'E4'],
    'liberacion_retencion=500000',
  ],
];
const TX: [string, Spec[], string[]?][] = [
  ['TX-2026-000123', [e1, e2, e3(), e4(), e5]],
  [
    'TX-2026-000124',
    [e1, e2, e3(), e3('E3b', 2), e4('E3b'), e5],
    ['E1', 'E2', 'E3', 'E3', 'E3b', 'E4', 'E5'],
  ],
  ['TX-2026-000125', rev(false)],
  ['TX-2026-000126', [e1, e2, e3(), e3('E3d', 1), e4(), e5]],
  ['TX-2026-000127', rev(true)],
];

const reg = new RegistroEvidencias(DIR, SK.registro);
const eventos: Record<string, unknown>[] = [];
for (const [t, specs, entrega] of TX) {
  const ev: Record<string, EvidenciaFirmada> = {};
  for (const [e, s, tau, k, a, deps, datos] of specs) {
    ev[e] = SERV[s].emitir(
      t,
      e,
      tau,
      k,
      a,
      deps.map(x => d(ev[x].E)),
      datos,
    );
    if (t === 'TX-2026-000123')
      eventos.push({
        t,
        e,
        s,
        tau,
        k,
        a,
        P: deps,
        datos,
        c: hex(ev[e].E.c),
        C: hex(C(ev[e].E), 10000),
        d: hex(d(ev[e].E)),
        sigma: hex(ev[e].sigma, 128),
      });
  }
  for (const e of entrega ?? specs.map(x => x[0])) reg.registrar(ev[e].E, ev[e].sigma);
}
const anc = anclarPeriodo(
  reg,
  new Testigo(),
  'P1',
  TX.map(x => x[0]),
);
if (!anc.ok) throw new Error(anc.motivo);
const R = reg.historial('TX-2026-000123');
const A: string[] = [hex(A0('TX-2026-000123'))];
R.reduce((a: Bytes, r) => {
  const n = acc(a, d(r[0]));
  A.push(hex(n));
  return n;
}, A0('TX-2026-000123'));
const K = anc.valor.K['TX-2026-000123'];
const salida = {
  descripcion: 'Vectores de prueba del caso de estudio (TX-2026-000123 y periodo P1)',
  claves_publicas: Object.fromEntries(
    [...DIR].map(([s, k]) => [
      s,
      k.export({ format: 'der', type: 'spki' }).subarray(12).toString('hex'),
    ]),
  ),
  eventos,
  A,
  K: {
    t: K.t,
    n: K.n,
    A: hex(K.A),
    sigR: hex(K.sigR, 128),
    bytes: hex(Kbytes(K), 10000),
  },
  A5: Object.fromEntries(Object.entries(anc.valor.K).map(([t, k]) => [t, hex(k.A)])),
  raiz: hex(anc.valor.raiz),
  prueba: anc.valor.pruebas['TX-2026-000123'].map(p => ({ izq: p.izq, h: hex(p.h) })),
  mth_vacio: hex(H(Buffer.alloc(0))),
};
mkdirSync('vectores', { recursive: true });
writeFileSync('vectores/vectores.json', JSON.stringify(salida, null, 2) + '\n');
console.log(
  `vectores/vectores.json: ${eventos.length} eventos, raíz ${salida.raiz.slice(0, 12)}…`,
);
