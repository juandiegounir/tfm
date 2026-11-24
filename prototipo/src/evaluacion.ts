/**
 * Evaluación del prototipo: escenarios del caso de estudio y pruebas añadidas en la 3.ª entrega.
 * Cada caso declara su resultado esperado; el programa termina con código 1 si alguno no coincide.
 * Ejecución: npx tsx src/evaluacion.ts  (genera resultados/resultados.json y resultados/resultados.md)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  A0,
  EntradaVerificacion,
  EvidenciaFirmada,
  H,
  Informe,
  MAX_PENDIENTES,
  MTH,
  PLAZO_PENDIENTE,
  Registro,
  RegistroEvidencias,
  ServicioEmisor,
  Testigo,
  anclarPeriodo,
  claveDemo,
  crearDirectorio,
  d,
  firmar,
  hex,
  prueba,
  verificar,
} from './marco.ts';

/** Devuelve el valor o detiene la evaluación si falta: la evaluación no puede seguir sin él. */
function exigir<T>(v: T | undefined, que: string): T {
  if (v === undefined) throw new Error(`falta ${que}`);
  return v;
}

// ---------- configuración: claves de demostración, directorio y servicios ----------
const NOMBRES = ['orquestador', 'cuentas', 'antifraude'];
const SK = Object.fromEntries([...NOMBRES, 'registro'].map(s => [s, claveDemo(s)]));
const DIR = crearDirectorio(SK);
const SERV: Record<string, ServicioEmisor> = Object.fromEntries(
  NOMBRES.map(s => [s, new ServicioEmisor(s, SK[s])]),
);
const datosEmitidos: string[] = []; // para comprobar después que el registro no los conserva

// ---------- construcción de transacciones ----------
/** [e, servicio, τ, clave, intento, dependencias (ids), datos de negocio] */
type Spec = [string, string, string, string, number, string[], string];

/** Emite los eventos en el orden de specs y los entrega al registro en el orden `entrega`. */
function transaccion(
  reg: RegistroEvidencias,
  t: string,
  specs: Spec[],
  entrega?: string[],
) {
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
    datosEmitidos.push(datos);
  }
  const respuestas = (entrega ?? specs.map(x => x[0])).map(e => ({
    e,
    ...reg.registrar(ev[e].E, ev[e].sigma),
  }));
  return { ev, respuestas };
}

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
const e3 = (riesgo = '0.12', e = 'E3', a = 1, s = 'antifraude'): Spec => [
  e,
  s,
  'AUTORIZACION_OK',
  'op-3',
  a,
  ['E1'],
  'resultado=aprobada;riesgo=' + riesgo,
];
const e4 = (ult = 'E3'): Spec => [
  'E4',
  'cuentas',
  'EJECUCION_OK',
  'op-4',
  1,
  ['E2', ult],
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
const normal = (riesgo = '0.12'): Spec[] => [e1, e2, e3(riesgo), e4(), e5];

function reverso(indebido: boolean): Spec[] {
  return [
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
}

/** Transacción con los intentos de op-3 indicados como [e, intento, riesgo, servicio]. */
function conIntentos(intentos: [string, number, string, string?][]): Spec[] {
  const at = intentos.map(([e, a, r, s]) => e3(r, e, a, s ?? 'antifraude'));
  return [e1, e2, ...at, e4(at[at.length - 1][0]), e5];
}

// ---------- casos de evaluación ----------
interface Caso {
  id: string;
  grupo: string;
  obs: string; // observación del tutor o requisito que comprueba
  descripcion: string;
  esperado: string;
  pasosEsperados?: string[]; // pasos que deben resultar INCORRECTO
  obtenido: string;
  paso: string;
  fallan: string;
  detalle: string;
}
const casos: Caso[] = [];

function caso(
  id: string,
  grupo: string,
  obs: string,
  descripcion: string,
  esperado: string,
  ejec: () => Informe,
  pasosEsperados?: string[],
) {
  const inf = ejec();
  const fallan = inf.pasos.filter(p => p.estado === 'INCORRECTO').map(p => p.id);
  const sinEv = inf.pasos.filter(p => p.estado === 'SIN_EVIDENCIA').map(p => p.id);
  casos.push({
    id,
    grupo,
    obs,
    descripcion,
    esperado,
    pasosEsperados,
    obtenido: inf.resultado,
    paso: inf.paso,
    fallan:
      [fallan.join(', '), sinEv.length ? `sin evidencia: ${sinEv.join(', ')}` : '']
        .filter(Boolean)
        .join('; ') || '—',
    detalle: inf.motivo + (inf.A ? ` [Aₙ = ${hex(inf.A, 12)}]` : ''),
  });
}
/** Caso que no es una verificación (respuesta del registro, propiedad de una función…). */
function comprobacion(
  id: string,
  grupo: string,
  obs: string,
  descripcion: string,
  esperado: string,
  obtenido: string,
  detalle: string,
) {
  casos.push({
    id,
    grupo,
    obs,
    descripcion,
    esperado,
    obtenido,
    paso: '—',
    fallan: '—',
    detalle,
  });
}

// =====================================================================================
// Periodo 1: las cinco transacciones del caso de estudio (sin cambios: mismos vectores)
// =====================================================================================
const reg = new RegistroEvidencias(DIR, SK.registro);
const testigo = new Testigo();
const T1 = transaccion(reg, 'TX-2026-000123', normal());
const T4 = transaccion(
  reg,
  'TX-2026-000124',
  [e1, e2, e3(), e3('0.12', 'E3b', 2), e4('E3b'), e5],
  ['E1', 'E2', 'E3', 'E3', 'E3b', 'E4', 'E5'],
);
transaccion(reg, 'TX-2026-000125', reverso(false));
transaccion(reg, 'TX-2026-000126', [e1, e2, e3(), e3('0.12', 'E3d', 1), e4(), e5]);
transaccion(reg, 'TX-2026-000127', reverso(true));
const TXS1 = [
  'TX-2026-000123',
  'TX-2026-000124',
  'TX-2026-000125',
  'TX-2026-000126',
  'TX-2026-000127',
];
const anc = anclarPeriodo(reg, testigo, 'P1', TXS1);
if (!anc.ok) throw new Error(anc.motivo);
const P1 = anc.valor;
const raizTestigo = exigir(testigo.raiz('P1'), 'raíz de P1'); // el auditor la obtiene del testigo, no del registro

/** Verificación con todas las evidencias de P1 salvo las que se indiquen. */
const entrada = (
  t: string,
  R: Registro[],
  extra: Partial<EntradaVerificacion> = {},
): EntradaVerificacion => ({
  historial: R,
  K: P1.K[t],
  prueba: P1.pruebas[t],
  raiz: raizTestigo,
  ...extra,
});
const R123 = reg.historial('TX-2026-000123');

// --- Vectores de regresión: deben coincidir con los publicados en la 2.ª entrega ---
const VECTORES: [string, string, string][] = [
  [
    'd(E1) de TX-2026-000123',
    hex(d(T1.ev.E1.E)),
    'ef95dee9015803df2266eb9bf35c272ae8005afd5ee2d83670b989fc75e20b5d',
  ],
  ['A₀ de TX-2026-000123', hex(A0('TX-2026-000123'), 12), 'de3182924a3b'],
  [
    'Raíz del periodo',
    hex(P1.raiz),
    'b968809d7fd6ad3d3f88d79a1a2d5efca2dbc8c02890f8fe5d43607095187c60',
  ],
  [
    'A₅ de TX-2026-000123',
    hex(P1.K['TX-2026-000123'].A),
    '8b811cdbda0385eeba1dd8b43e22f4a2c0870952b2afac908dacec0c0478d807',
  ],
  [
    'A₅ de TX-2026-000124',
    hex(P1.K['TX-2026-000124'].A),
    '1e5c24675b6e3934ccd732b0bf284eb78cf0aedbcbab89fed2a3c36aba6ba3bd',
  ],
  [
    'A₅ de TX-2026-000125',
    hex(P1.K['TX-2026-000125'].A),
    '04cec0287376b1c87b76a2d71be90b4edfdf040a2163efb6c769d370c62c2578',
  ],
  [
    'A₅ de TX-2026-000126',
    hex(P1.K['TX-2026-000126'].A),
    '2677629033a1a5460e4d9217111938fe7d761ca3f731e44b1a2798d08a403c26',
  ],
  [
    'A₅ de TX-2026-000127',
    hex(P1.K['TX-2026-000127'].A),
    '778cecc59f9322639f1e481bca3bf6367402d3ea0ca16b27b18ccf683523d36d',
  ],
];
for (const [n, obt, esp] of VECTORES)
  comprobacion(
    'V-' + n.split(' ')[0],
    'Vectores',
    'RNF-01',
    n,
    esp.slice(0, 12),
    obt === esp ? esp.slice(0, 12) : obt.slice(0, 12),
    obt,
  );

// --- Escenarios del caso de estudio (tabla 11), con el verificador corregido ---
const G = 'Caso de estudio';
caso('1', G, 'RF-01–RF-06', 'Ejecución normal', 'VÁLIDO', () =>
  verificar(entrada('TX-2026-000123', R123), DIR),
);
const alterado = R123.map(r => [...r] as Registro);
alterado[2] = [
  { ...R123[2][0], c: H(Buffer.from('resultado=aprobada;riesgo=0.92')) },
  R123[2][1],
  R123[2][2],
];
const datosOriginales = {
  E3: exigir(SERV.antifraude.datos('TX-2026-000123', 'E3'), 'datos de E3'),
};
caso(
  '2',
  G,
  'Amenaza alteración',
  'Alteración de E3 (riesgo 0,12 → 0,92)',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000123', alterado, { datos: datosOriginales }), DIR),
  ['V3', 'V4', 'V5', 'V7'],
);
caso(
  '3',
  G,
  'Amenaza eliminación',
  'Eliminación de E3',
  'INVÁLIDO',
  () =>
    verificar(
      entrada(
        'TX-2026-000123',
        R123.filter(r => r[0].e !== 'E3'),
      ),
      DIR,
    ),
  ['V2', 'V4', 'V5', 'V6'],
);
comprobacion(
  '4a-r',
  G,
  'RF-05',
  'Reentrega idéntica de E3 al registro',
  'IGNORADO',
  T4.respuestas[3].estado,
  T4.respuestas[3].motivo,
);
caso('4a', G, 'RF-05', 'Reintento legítimo (intentos 1 y 2)', 'VÁLIDO', () =>
  verificar(entrada('TX-2026-000124', reg.historial('TX-2026-000124')), DIR),
);
caso(
  '4b',
  G,
  'RF-05',
  'Duplicación (dos eventos con intento 1)',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000126', reg.historial('TX-2026-000126')), DIR),
  ['V6'],
);
caso('5a', G, 'RF-05', 'Reverso tras fallo de ejecución', 'VÁLIDO', () =>
  verificar(entrada('TX-2026-000125', reg.historial('TX-2026-000125')), DIR),
);
caso(
  '5b',
  G,
  'RF-05',
  'Reverso sin fallo previo',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000127', reg.historial('TX-2026-000127')), DIR),
  ['V6'],
);

// Escenario 6: el atacante controla el registro y las claves y reconstruye el historial
const regAtacante = new RegistroEvidencias(DIR, SK.registro);
transaccion(regAtacante, 'TX-2026-000123', normal('0.92'));
const K6 = regAtacante.cerrar('TX-2026-000123');
if (!K6.ok) throw new Error(K6.motivo);
const R6 = regAtacante.historial('TX-2026-000123');
caso(
  '6a',
  G,
  'Obs. 1',
  'Reconstrucción completa sin raíz del testigo',
  'NO_VERIFICABLE',
  () => verificar({ historial: R6, K: K6.valor }, DIR),
);
caso(
  '6b',
  G,
  'Obs. 1',
  'Reconstrucción completa con raíz del testigo',
  'INVÁLIDO',
  () =>
    verificar(
      {
        historial: R6,
        K: K6.valor,
        prueba: P1.pruebas['TX-2026-000123'],
        raiz: raizTestigo,
      },
      DIR,
    ),
  ['V1'],
);

// --- Pruebas complementarias de la 2.ª entrega ---
const GC = 'Complementarias';
caso(
  'C1',
  GC,
  'Amenaza reordenamiento',
  'Reordenamiento (E5 antes que E4)',
  'INVÁLIDO',
  () =>
    verificar(
      entrada('TX-2026-000123', [R123[0], R123[1], R123[2], R123[4], R123[3]]),
      DIR,
    ),
  ['V4', 'V5'],
);
const intrusa = new ServicioEmisor('antifraude', claveDemo('atacante')).emitir(
  'TX-2026-000123',
  'E6',
  'AUTORIZACION_OK',
  'op-7',
  1,
  [d(R123[0][0])],
  'resultado=aprobada',
);
caso(
  'C2',
  GC,
  'Amenaza inserción',
  'Inserción de un evento firmado con clave ajena',
  'INVÁLIDO',
  () =>
    verificar(
      entrada('TX-2026-000123', [
        ...R123,
        [intrusa.E, intrusa.sigma, Buffer.alloc(32)],
      ]),
      DIR,
    ),
  ['V2', 'V3', 'V5'],
);
const sup = R123.map(r => [...r] as Registro);
sup[2] = [R123[2][0], firmar(SK.cuentas, d(R123[2][0])), R123[2][2]];
caso(
  'C3',
  GC,
  'Amenaza suplantación',
  'Suplantación: E3 firmado por cuentas',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000123', sup), DIR),
  ['V3'],
);

// =====================================================================================
// Obs. 1: tres resultados de verificación
// =====================================================================================
const G1 = 'Obs. 1 – Testigo externo';
caso(
  'T1',
  G1,
  'Obs. 1',
  'Historial íntegro, con raíz del testigo pero sin prueba de inclusión',
  'NO_VERIFICABLE',
  () => verificar(entrada('TX-2026-000123', R123, { prueba: undefined }), DIR),
);
caso(
  'T2',
  G1,
  'Obs. 1',
  'Historial íntegro, sin punto de referencia (transacción no cerrada)',
  'NO_VERIFICABLE',
  () => verificar({ historial: R123 }, DIR),
);
caso(
  'T3',
  G1,
  'Obs. 1',
  'Historial íntegro, raíz de otro periodo (compromiso inválido)',
  'INVÁLIDO',
  () =>
    verificar(
      entrada('TX-2026-000123', R123, { raiz: MTH([Buffer.from('otro periodo')]) }),
      DIR,
    ),
  ['V1'],
);
const Kfalso = {
  ...P1.K['TX-2026-000123'],
  sigR: Buffer.from(P1.K['TX-2026-000123'].sigR),
};
Kfalso.sigR[0] ^= 1;
caso(
  'T4',
  G1,
  'Obs. 1',
  'Punto de referencia con la firma del registro alterada',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000123', R123, { K: Kfalso }), DIR),
  ['V1'],
);
caso(
  'T5',
  G1,
  'Obs. 1',
  'Prueba de inclusión mal formada',
  'INVÁLIDO',
  () =>
    verificar(
      entrada('TX-2026-000123', R123, {
        prueba: [{ izq: true, h: Buffer.alloc(3) }] as never,
      }),
      DIR,
    ),
  ['V1'],
);
caso(
  'T6',
  G1,
  'Obs. 1',
  'Alteración de E3 sin raíz del testigo: la inconsistencia interna se sigue detectando',
  'INVÁLIDO',
  () => verificar({ historial: alterado, K: P1.K['TX-2026-000123'] }, DIR),
  ['V3', 'V4', 'V5'],
);

// =====================================================================================
// Obs. 2: separación entre datos de negocio y evidencias (RNF-06)
// =====================================================================================
const G2 = 'Obs. 2 – RNF-06';
const volcado = reg.volcado();
const filtrados = datosEmitidos.filter(
  x => volcado.includes(x) || volcado.includes(Buffer.from(x).toString('hex')),
);
const terminos = ['origen=', 'destino=', 'importe', '500000', 'EUR', 'riesgo='].filter(
  x => volcado.includes(x),
);
comprobacion(
  'D1',
  G2,
  'RNF-06',
  `El registro no conserva datos de negocio (${datosEmitidos.length} datos emitidos, ${volcado.length} caracteres revisados)`,
  'SIN DATOS DE NEGOCIO',
  filtrados.length || terminos.length ? 'CONTIENE DATOS' : 'SIN DATOS DE NEGOCIO',
  filtrados.length || terminos.length
    ? [...filtrados, ...terminos].join(', ')
    : 'ningún dato ni término de negocio en el contenido del registro',
);
const conData = { ...R123[0][0], data: D_E1 };
const rData = new RegistroEvidencias(DIR, SK.registro).registrar(
  conData,
  firmar(SK.orquestador, d(R123[0][0])),
);
comprobacion(
  'D2',
  G2,
  'RNF-06',
  'El registro rechaza un evento que incluye el campo data',
  'RECHAZADO',
  rData.estado,
  rData.motivo,
);
caso(
  'D3',
  G2,
  'RNF-06',
  'El verificador rechaza un historial con datos de negocio incrustados',
  'INVÁLIDO',
  () =>
    verificar(
      entrada('TX-2026-000123', [
        [conData, R123[0][1], R123[0][2]],
        ...R123.slice(1),
      ]),
      DIR,
    ),
  ['V2'],
);
// Limitación: resumen de datos predecibles (ataque por diccionario)
const cE3 = R123[2][0].c;
let intentosDic = 0;
let recuperado: string | undefined;
for (let i = 0; i <= 100 && !recuperado; i++) {
  const cand = `resultado=aprobada;riesgo=${(i / 100).toFixed(2)}`;
  intentosDic++;
  if (H(Buffer.from(cand)).equals(cE3)) recuperado = cand;
}
comprobacion(
  'D4',
  G2,
  'RNF-06 (limitación)',
  'Ataque por diccionario sobre c de E3 (riesgo de 0,00 a 1,00)',
  'RECUPERADO',
  recuperado ? 'RECUPERADO' : 'NO RECUPERADO',
  recuperado ? `«${recuperado}» en ${intentosDic} intentos` : `${intentosDic} intentos`,
);

// =====================================================================================
// Periodo 2: pruebas nuevas de reintentos, robustez y llegada fuera de orden
// =====================================================================================
const reg2 = new RegistroEvidencias(DIR, SK.registro);
const TX2: string[] = [];
const tx2 = (t: string, specs: Spec[], entrega?: string[]) => (
  TX2.push(t),
  transaccion(reg2, t, specs, entrega)
);

// Obs. 3: reglas de reintento
tx2(
  'TX-2026-000201',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3b', 2, '0.12'],
    ['E3c', 3, '0.12'],
  ]),
);
tx2(
  'TX-2026-000202',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3c', 3, '0.12'],
  ]),
);
tx2('TX-2026-000203', conIntentos([['E3', 9, '0.12']]));
tx2(
  'TX-2026-000204',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3d', 1, '0.50'],
  ]),
);
tx2(
  'TX-2026-000205',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3b', 2, '0.50'],
  ]),
);
tx2(
  'TX-2026-000206',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3b', 2, '0.12'],
  ]),
  ['E1', 'E2', 'E3b', 'E3', 'E4', 'E5'],
);
tx2(
  'TX-2026-000207',
  conIntentos([
    ['E3', 1, '0.12'],
    ['E3b', 2, '0.12', 'cuentas'],
  ]),
);

// Obs. 7: eventos fuera de orden en el registro
const O1 = tx2('TX-2026-000210', normal(), ['E1', 'E2', 'E4', 'E3', 'E5']);
tx2('TX-2026-000211', normal(), ['E1', 'E2', 'E4', 'E5']); // E3 no llega nunca
const cierreAntes = reg2.cerrar('TX-2026-000211');
reg2.avanzarReloj(PLAZO_PENDIENTE + 1);
const incid = reg2.incidencias.filter(i => i.motivo.includes('plazo')).map(i => i.e);

// Obs. 4: entradas inválidas en el registro
const extraño = new ServicioEmisor(
  'pagos-externos',
  claveDemo('pagos-externos'),
).emitir('TX-2026-000220', 'E1', 'INICIO', 'op-1', 1, [], D_E1);
const rDesc = reg2.registrar(extraño.E, extraño.sigma);
const huerfano = SERV.cuentas.emitir(
  'TX-2026-000221',
  'E4',
  'EJECUCION_OK',
  'op-4',
  1,
  [H(Buffer.from('inexistente'))],
  D_E4,
);
const nInc = reg2.incidencias.length;
const rHuerf = reg2.registrar(huerfano.E, huerfano.sigma);
reg2.avanzarReloj(PLAZO_PENDIENTE + 1);
const venceHuerf = reg2.incidencias.slice(nInc).find(i => i.e === 'E4');
const rFirmaCorta = reg2.registrar(T1.ev.E1.E, Buffer.alloc(10));
const rMalFormado = reg2.registrar({ ...T1.ev.E1.E, a: 0 }, T1.ev.E1.sigma);
const rCerrarDesc = reg2.cerrar('TX-2026-999999');

const anc2 = anclarPeriodo(reg2, testigo, 'P2', TX2);
if (!anc2.ok) throw new Error(anc2.motivo);
const P2 = anc2.valor;
const raiz2 = exigir(testigo.raiz('P2'), 'raíz de P2');
const entrada2 = (
  t: string,
  extra: Partial<EntradaVerificacion> = {},
): EntradaVerificacion => ({
  historial: reg2.historial(t),
  K: P2.K[t],
  prueba: P2.pruebas[t],
  raiz: raiz2,
  ...extra,
});

const G3 = 'Obs. 3 – Reintentos';
caso('I1', G3, 'RF-05', 'Intentos 1, 2 y 3', 'VÁLIDO', () =>
  verificar(entrada2('TX-2026-000201'), DIR),
);
caso(
  'I2',
  G3,
  'RF-05',
  'Intentos 1 y 3 (falta el 2)',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000202'), DIR),
  ['V6'],
);
caso(
  'I3',
  G3,
  'RF-05',
  'Primer y único intento con número 9',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000203'), DIR),
  ['V6'],
);
caso(
  'I4',
  G3,
  'RF-05',
  'Dos eventos con intento 1 y distinto contenido',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000204'), DIR),
  ['V6'],
);
caso(
  'I5',
  G3,
  'RF-05',
  'Intentos 1 y 2 con resultados distintos',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000205'), DIR),
  ['V6'],
);
caso(
  'I6',
  G3,
  'RF-05',
  'Intento 2 registrado antes que el 1 (entrega desordenada)',
  'VÁLIDO',
  () => verificar(entrada2('TX-2026-000206'), DIR),
);
caso(
  'I7',
  G3,
  'RF-05',
  'Intento 2 emitido por otro servicio',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000207'), DIR),
  ['V6'],
);

const G4 = 'Obs. 4 – Robustez';
comprobacion(
  'X1',
  G4,
  'Obs. 4 A',
  'Registro: evento de un emisor que no está en el directorio',
  'RECHAZADO',
  rDesc.estado,
  rDesc.motivo,
);
const conExtraño: Registro[] = R123.map((r, i) =>
  i === 2 ? [{ ...r[0], s: 'pagos-externos' }, r[1], r[2]] : r,
);
caso(
  'X2',
  G4,
  'Obs. 4 A',
  'Verificador: evento atribuido a un emisor desconocido',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000123', conExtraño), DIR),
  ['V3'],
);
const vacio = MTH([]);
const pVacio = prueba([], 0);
comprobacion(
  'X3',
  G4,
  'Obs. 4 B',
  'Árbol de Merkle de un periodo sin transacciones',
  'e3b0c44298fc',
  hex(vacio, 12),
  `MTH({}) = SHA-256() = ${hex(vacio)} (RFC 9162, 2.1.1); prueba de inclusión: ${pVacio === undefined ? 'no existe (resultado controlado)' : 'error'}`,
);
comprobacion(
  'X4',
  G4,
  'Obs. 4 C',
  'Registro: referencia causal inexistente',
  'PENDIENTE → RECHAZADO',
  `${rHuerf.estado} → ${venceHuerf ? venceHuerf.estado : 'sin respuesta'}`,
  `${rHuerf.motivo}; ${venceHuerf?.motivo ?? ''}`,
);
const E4huerf = SERV.cuentas.emitir(
  'TX-2026-000123',
  'E4',
  'EJECUCION_OK',
  'op-4',
  1,
  [d(R123[1][0]), H(Buffer.from('inexistente'))],
  D_E4,
);
const conHuerf: Registro[] = R123.map((r, i) =>
  i === 3 ? [E4huerf.E, E4huerf.sigma, r[2]] : r,
);
caso(
  'X5',
  G4,
  'Obs. 4 C',
  'Verificador: E4 con una referencia causal inexistente',
  'INVÁLIDO',
  () => verificar(entrada('TX-2026-000123', conHuerf), DIR),
  ['V4'],
);
const sigAlt = Buffer.from(R123[2][1]);
sigAlt[10] ^= 0xff;
caso(
  'X6',
  G4,
  'Obs. 4 D',
  'Firma inválida (un byte alterado)',
  'INVÁLIDO',
  () =>
    verificar(
      entrada(
        'TX-2026-000123',
        R123.map((r, i) => (i === 2 ? [r[0], sigAlt, r[2]] : r)),
      ),
      DIR,
    ),
  ['V3'],
);
caso(
  'X7',
  G4,
  'Obs. 4 D',
  'Firma mal formada (10 bytes)',
  'INVÁLIDO',
  () =>
    verificar(
      entrada(
        'TX-2026-000123',
        R123.map((r, i) => (i === 2 ? [r[0], Buffer.alloc(10), r[2]] : r)),
      ),
      DIR,
    ),
  ['V3'],
);
comprobacion(
  'X8',
  G4,
  'Obs. 4 D',
  'Registro: firma mal formada',
  'RECHAZADO',
  rFirmaCorta.estado,
  rFirmaCorta.motivo,
);
caso(
  'X9',
  G4,
  'Obs. 4 D',
  'Verificador: evento mal formado (intento 0, referencia de 5 bytes, t vacío)',
  'INVÁLIDO',
  () =>
    verificar(
      entrada(
        'TX-2026-000123',
        R123.map((r, i) =>
          i === 3 ? [{ ...r[0], a: 0, t: '', P: [Buffer.alloc(5)] }, r[1], r[2]] : r,
        ) as never,
      ),
      DIR,
    ),
  ['V2'],
);
comprobacion(
  'X10',
  G4,
  'Obs. 4 D',
  'Registro: evento mal formado (intento 0)',
  'RECHAZADO',
  rMalFormado.estado,
  rMalFormado.motivo,
);
caso(
  'X11',
  G4,
  'Obs. 4',
  'Verificador: historial que no es una lista',
  'INVÁLIDO',
  () => verificar({ historial: null as never, K: P1.K['TX-2026-000123'] }, DIR),
  ['V2'],
);
comprobacion(
  'X12',
  G4,
  'Obs. 4',
  'Registro: cierre de una transacción desconocida',
  'ERROR CONTROLADO',
  rCerrarDesc.ok ? 'CERRADA' : 'ERROR CONTROLADO',
  rCerrarDesc.ok ? '' : rCerrarDesc.motivo,
);

const G7 = 'Obs. 7 – Fuera de orden';
const rE4 = exigir(O1.respuestas.find(r => r.e === 'E4'), 'respuesta a E4');
const rE3 = exigir(O1.respuestas.find(r => r.e === 'E3'), 'respuesta a E3');
comprobacion(
  'O1',
  G7,
  'Obs. 7',
  'E4 llega antes que E3: queda pendiente y se acepta al llegar E3',
  'PENDIENTE → ACEPTADO',
  `${rE4.estado} → ${rE3.liberados?.includes('E4') ? 'ACEPTADO' : 'sin aceptar'}`,
  `${rE4.motivo}; al llegar E3 se liberan: ${rE3.liberados?.join(', ') ?? '—'}`,
);
caso(
  'O2',
  G7,
  'Obs. 7',
  'Transacción con E4 recibido fuera de orden, una vez anclada',
  'VÁLIDO',
  () => verificar(entrada2('TX-2026-000210'), DIR),
);
comprobacion(
  'O3',
  G7,
  'Obs. 7',
  'E3 no llega: el registro no permite cerrar la transacción mientras haya pendientes',
  'ERROR CONTROLADO',
  cierreAntes.ok ? 'CERRADA' : 'ERROR CONTROLADO',
  cierreAntes.ok ? '' : cierreAntes.motivo,
);
comprobacion(
  'O4',
  G7,
  'Obs. 7',
  'E3 no llega: E4 y E5 vencen y se notifican como incidencia',
  'E4, E5',
  incid.filter(e => e === 'E4' || e === 'E5').join(', '),
  `incidencias por plazo: ${incid.join(', ')} (plazo ${PLAZO_PENDIENTE} recepciones, cola máx. ${MAX_PENDIENTES})`,
);
caso(
  'O5',
  G7,
  'Obs. 7',
  'Transacción incompleta (sin E3) verificada tras su cierre',
  'INVÁLIDO',
  () => verificar(entrada2('TX-2026-000211'), DIR),
  ['V6'],
);

// ---------- informe ----------
let fallos = 0;
for (const c of casos) {
  const fallanIds = c.fallan.split(';')[0].split(', ');
  const okPasos =
    !c.pasosEsperados || c.pasosEsperados.every(p => fallanIds.includes(p));
  (c as Caso & { coincide: boolean }).coincide = c.obtenido === c.esperado && okPasos;
  if (!(c as Caso & { coincide: boolean }).coincide) fallos++;
}
const filas = casos as (Caso & { coincide: boolean })[];
let grupo = '';
for (const c of filas) {
  if (c.grupo !== grupo) console.log(`\n== ${(grupo = c.grupo)} ==`);
  console.log(
    `${c.coincide ? '✔' : '✘'} ${c.id.padEnd(6)} ${c.descripcion.slice(0, 62).padEnd(62)} esperado ${c.esperado.padEnd(15)} obtenido ${c.obtenido.padEnd(15)} ${c.fallan}`,
  );
  if (!c.coincide || process.argv.includes('-v')) console.log(`         ${c.detalle}`);
}
console.log(`\nRaíz P1: ${hex(P1.raiz)}\nRaíz P2: ${hex(P2.raiz)}`);
console.log(
  `\n${filas.length - fallos}/${filas.length} casos con el resultado esperado.`,
);

mkdirSync('resultados', { recursive: true });
writeFileSync(
  'resultados/resultados.json',
  JSON.stringify({ raizP1: hex(P1.raiz), raizP2: hex(P2.raiz), casos: filas }, null, 2),
);
const md = [
  '| Id | Grupo | Descripción | Esperado | Obtenido | Pasos que fallan | Detalle | ✔ |',
  '|---|---|---|---|---|---|---|---|',
  ...filas.map(
    c =>
      `| ${c.id} | ${c.grupo} | ${c.descripcion} | ${c.esperado} | ${c.obtenido} | ${c.fallan} | ${c.detalle.replace(/\|/g, '/')} | ${c.coincide ? 'sí' : 'NO'} |`,
  ),
];
writeFileSync('resultados/resultados.md', md.join('\n') + '\n');
process.exit(fallos ? 1 : 0);
