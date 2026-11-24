/**
 * Definición de los pasos Gherkin (Dado / Cuando / Entonces) sobre los componentes del marco:
 * ServicioEmisor (algoritmo 1), RegistroEvidencias (algoritmos 2 y 3), Testigo y verificar (algoritmo 4).
 */
import assert from 'node:assert/strict';
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import {
  A0,
  EvidenciaFirmada,
  EntradaVerificacion,
  H,
  MTH,
  PLAZO_PENDIENTE,
  Registro,
  RegistroEvidencias,
  ServicioEmisor,
  anclarPeriodo,
  claveDemo,
  d,
  firmar,
  hex,
  prueba,
  verificar,
} from '../../src/marco.ts';
import { Mundo } from '../soporte/mundo.ts';

const lista = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

// ---------------------------------------------------------------- saga y registro (Dado)
Given('que la saga {string} emite los eventos:', function (this: Mundo, t: string, tabla: DataTable) {
  const ev = new Map<string, EvidenciaFirmada>();
  for (const f of tabla.hashes()) {
    const P = lista(f['depende de']).map(x => {
      assert.ok(ev.has(x), `${f.e} depende de ${x}, que no se ha emitido`);
      return d(ev.get(x)!.E);
    });
    ev.set(f.e, this.servicio(f.servicio).emitir(t, f.e, f.tipo, f.clave, Number(f.intento), P, f.datos));
    this.datosEmitidos.push(f.datos);
  }
  this.emitidas.set(t, ev);
  this.ultimaTx = t;
});

function entregar(w: Mundo, t: string, orden: string[]) {
  const ev = w.emitidas.get(t)!;
  const rs = orden.map(e => ({ ...w.registro.registrar(ev.get(e)!.E, ev.get(e)!.sigma), e }));
  w.respuestas.set(t, [...(w.respuestas.get(t) ?? []), ...rs]);
}
Given('el registro de evidencias los recibe en el orden de emisión', function (this: Mundo) {
  entregar(this, this.ultimaTx, [...this.emitidas.get(this.ultimaTx)!.keys()]);
});
Given('el registro de evidencias los recibe en el orden {string}', function (this: Mundo, orden: string) {
  entregar(this, this.ultimaTx, lista(orden));
});
Given('el registro cierra {string} y ancla el periodo {string} en el testigo', function (this: Mundo, txs: string, p: string) {
  const r = anclarPeriodo(this.registro, this.testigo, p, lista(txs));
  assert.ok(r.ok, r.ok ? '' : r.motivo);
  this.anclajes.set(p, r.valor);
  this.txsPeriodo.set(p, lista(txs));
  for (const t of lista(txs)) {
    this.periodoDe.set(t, p);
    this.K.set(t, r.valor.K[t]);
  }
});

// ---------------------------------------------------------------- atacante (Cuando)
When('el atacante cambia los datos del evento {string} de {string} a {string}', function (this: Mundo, e: string, t: string, datos: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [{ ...R[i][0], c: H(Buffer.from(datos)) }, R[i][1], R[i][2]];
});
When('el servicio {string} aporta al auditor los datos originales del evento {string}', function (this: Mundo, s: string, e: string) {
  this.datosAportados[e] = this.servicio(s).datos(this.ultimaTx, e)!;
});
When('el atacante elimina el evento {string} de {string}', function (this: Mundo, e: string, t: string) {
  this.historial(t).splice(this.posicion(t, e), 1);
});
When('el atacante intercambia los eventos {string} y {string} de {string}', function (this: Mundo, a: string, b: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, a), j = this.posicion(t, b);
  [R[i], R[j]] = [R[j], R[i]];
});
When('el atacante inserta en {string} un evento {string} del servicio {string} firmado con una clave ajena', function (this: Mundo, t: string, e: string, s: string) {
  const R = this.historial(t);
  // el atacante firma con su propia clave un evento que atribuye al servicio s
  const ev = new ServicioEmisor(s, claveDemo('atacante')).emitir(t, e, 'AUTORIZACION_OK', 'op-7', 1, [d(R[0][0])], 'resultado=aprobada');
  R.push([ev.E, ev.sigma, Buffer.alloc(32)]);
});
When('el atacante vuelve a firmar el evento {string} de {string} con la clave del servicio {string}', function (this: Mundo, e: string, t: string, s: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [R[i][0], firmar(this.sk[s], d(R[i][0])), R[i][2]];
});
When('el atacante altera un byte de la firma del punto de referencia de {string}', function (this: Mundo, t: string) {
  const K = this.K.get(t)!;
  const sigR = Buffer.from(K.sigR);
  sigR[0] ^= 1;
  this.K.set(t, { ...K, sigR });
});
When('el atacante incrusta el campo {string} en el evento {string} de {string}', function (this: Mundo, campo: string, e: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [{ ...R[i][0], [campo]: this.datosEmitidos[0] }, R[i][1], R[i][2]];
});
When('el atacante atribuye el evento {string} de {string} al servicio {string}', function (this: Mundo, e: string, t: string, s: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [{ ...R[i][0], s }, R[i][1], R[i][2]];
});
When('el atacante sustituye el evento {string} de {string} por uno firmado que depende de un resumen inexistente', function (this: Mundo, e: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  const E = R[i][0];
  const ev = this.servicio(E.s).emitir(t, e, E.tau, E.k, E.a, [E.P[0], H(Buffer.from('inexistente'))], 'datos');
  R[i] = [ev.E, ev.sigma, R[i][2]];
});
When('el atacante altera un byte de la firma del evento {string} de {string}', function (this: Mundo, e: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  const s = Buffer.from(R[i][1]);
  s[10] ^= 0xff;
  R[i] = [R[i][0], s, R[i][2]];
});
When('el atacante sustituye la firma del evento {string} de {string} por 10 bytes', function (this: Mundo, e: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [R[i][0], Buffer.alloc(10), R[i][2]];
});
When('el atacante deja el evento {string} de {string} con intento 0, una referencia de 5 bytes y la transacción vacía', function (this: Mundo, e: string, t: string) {
  const R = this.historial(t), i = this.posicion(t, e);
  R[i] = [{ ...R[i][0], a: 0, t: '', P: [Buffer.alloc(5)] }, R[i][1], R[i][2]];
});
When('el atacante, con el control del registro y las claves de todos los servicios, reconstruye {string} con los datos del evento {string} cambiados a {string}', function (this: Mundo, t: string, e: string, datos: string) {
  // El atacante usa un registro propio con la clave del registro y reemite todos los eventos con las claves de los servicios.
  const regAtacante = new RegistroEvidencias(this.dir, this.sk.registro);
  const nuevos = new Map<string, EvidenciaFirmada>();
  for (const [id, ev] of this.emitidas.get(t)!) {
    const E = ev.E;
    const P = E.P.map(p => {
      const orig = [...this.emitidas.get(t)!.entries()].find(([, x]) => d(x.E).equals(p))![0];
      return d(nuevos.get(orig)!.E);
    });
    const dat = id === e ? datos : this.servicio(E.s).datos(t, id)!;
    const n = this.servicio(E.s).emitir(t, id, E.tau, E.k, E.a, P, dat);
    nuevos.set(id, n);
    regAtacante.registrar(n.E, n.sigma);
  }
  const K = regAtacante.cerrar(t);
  assert.ok(K.ok);
  this.reconstruido = { historial: regAtacante.historial(t), K: K.valor, t };
});
When('el atacante prueba los niveles de riesgo de 0,00 a 1,00 contra el resumen c del evento {string} de {string}', function (this: Mundo, e: string, t: string) {
  const c = this.historial(t)[this.posicion(t, e)][0].c;
  let intentos = 0, recuperado: string | undefined;
  for (let i = 0; i <= 100 && !recuperado; i++) {
    const cand = `resultado=aprobada;riesgo=${(i / 100).toFixed(2)}`;
    intentos++;
    if (H(Buffer.from(cand)).equals(c)) recuperado = cand;
  }
  this.diccionario = { recuperado, intentos };
});

// ---------------------------------------------------------------- entradas al registro (Cuando)
When('un servicio envía a un registro nuevo el evento {string} de {string} con el campo {string}', function (this: Mundo, e: string, t: string, campo: string) {
  const ev = this.emitidas.get(t)!.get(e)!;
  const otro = new RegistroEvidencias(this.dir, this.sk.registro);
  this.ultimaRespuesta = otro.registrar({ ...ev.E, [campo]: this.datosEmitidos[0] }, ev.sigma);
});
When('el servicio {string}, que no figura en el directorio, envía al registro el evento {string} de {string}', function (this: Mundo, s: string, e: string, t: string) {
  const ev = this.servicio(s).emitir(t, e, 'INICIO', 'op-1', 1, [], 'origen=0001;destino=0002;importe=500000;moneda=EUR');
  this.ultimaRespuesta = this.registro.registrar(ev.E, ev.sigma);
});
When('el servicio {string} envía al registro un evento {string} de {string} que depende de un resumen inexistente', function (this: Mundo, s: string, e: string, t: string) {
  const ev = this.servicio(s).emitir(t, e, 'EJECUCION_OK', 'op-4', 1, [H(Buffer.from('inexistente'))], 'datos');
  this.ultimaTx = t;
  this.respuestas.set(t, [{ ...this.registro.registrar(ev.E, ev.sigma), e }]);
});
When('pasa el plazo de espera sin que llegue la dependencia', function (this: Mundo) {
  this.registro.avanzarReloj(PLAZO_PENDIENTE + 1);
});
When('el servicio {string} envía al registro el evento {string} de {string} con una firma de 10 bytes', function (this: Mundo, _s: string, e: string, t: string) {
  this.ultimaRespuesta = this.registro.registrar(this.emitidas.get(t)!.get(e)!.E, Buffer.alloc(10));
});
When('el servicio {string} envía al registro el evento {string} de {string} con intento 0', function (this: Mundo, _s: string, e: string, t: string) {
  const ev = this.emitidas.get(t)!.get(e)!;
  this.ultimaRespuesta = this.registro.registrar({ ...ev.E, a: 0 }, ev.sigma);
});
When('el registro intenta cerrar {string}', function (this: Mundo, t: string) {
  const r = this.registro.cerrar(t);
  this.cierre = r.ok ? { ok: true } : { ok: false, motivo: r.motivo };
});
When('se calcula la raíz de un periodo vacío', function (this: Mundo) {
  this.raizVacia = MTH([]);
  this.pruebaVacia = prueba([], 0);
});

// ---------------------------------------------------------------- auditor (Cuando)
function entrada(w: Mundo, t: string, extra: Partial<EntradaVerificacion> = {}): EntradaVerificacion {
  const p = w.anclajes.get(w.periodoDe.get(t)!);
  return {
    historial: w.historial(t),
    K: w.K.get(t),
    prueba: p?.pruebas[t],
    raiz: p ? w.testigo.raiz(p.periodo) : undefined,
    datos: Object.keys(w.datosAportados).length ? w.datosAportados : undefined,
    ...extra,
  };
}
const ver = (w: Mundo, x: EntradaVerificacion) => (w.informe = verificar(x, w.dir));

When('el auditor verifica {string} con la raíz del testigo', function (this: Mundo, t: string) {
  ver(this, entrada(this, t));
});
When('el auditor verifica {string} sin la raíz del testigo', function (this: Mundo, t: string) {
  ver(this, entrada(this, t, { prueba: undefined, raiz: undefined }));
});
When('el auditor verifica {string} sin la prueba de inclusión', function (this: Mundo, t: string) {
  ver(this, entrada(this, t, { prueba: undefined }));
});
When('el auditor verifica {string} sin punto de referencia ni raíz', function (this: Mundo, t: string) {
  ver(this, entrada(this, t, { K: undefined, prueba: undefined, raiz: undefined }));
});
When('el auditor verifica {string} con la raíz de otro periodo', function (this: Mundo, t: string) {
  ver(this, entrada(this, t, { raiz: MTH([Buffer.from('otro periodo')]) }));
});
When('el auditor verifica {string} con una prueba de inclusión mal formada', function (this: Mundo, t: string) {
  ver(this, entrada(this, t, { prueba: [{ izq: true, h: Buffer.alloc(3) }] as never }));
});
When('el auditor verifica {string} con un historial que no es una lista', function (this: Mundo, t: string) {
  ver(this, { historial: null as never, K: this.K.get(t) });
});
When('el auditor verifica el historial reconstruido sin la raíz del testigo', function (this: Mundo) {
  const r = this.reconstruido!;
  ver(this, { historial: r.historial, K: r.K });
});
When('el auditor verifica el historial reconstruido con la raíz del testigo', function (this: Mundo) {
  const r = this.reconstruido!;
  const p = this.anclajes.get(this.periodoDe.get(r.t)!)!;
  ver(this, { historial: r.historial, K: r.K, prueba: p.pruebas[r.t], raiz: this.testigo.raiz(p.periodo) });
});

// ---------------------------------------------------------------- resultados (Entonces)
const fallan = (w: Mundo, estado: string) =>
  w.informe!.pasos.filter(p => p.estado === estado).map(p => p.id).sort();

Then('el resultado es {string}', function (this: Mundo, r: string) {
  assert.equal(this.informe!.resultado, r, this.informe!.motivo);
});
Then('fallan los pasos {string}', function (this: Mundo, pasos: string) {
  assert.deepEqual(fallan(this, 'INCORRECTO'), lista(pasos).sort());
});
Then('el paso {string} queda sin evidencia', function (this: Mundo, p: string) {
  assert.deepEqual(fallan(this, 'INCORRECTO'), []);
  assert.ok(fallan(this, 'SIN_EVIDENCIA').includes(p));
});
Then('el verificador señala la regla {string}', function (this: Mundo, regla: string) {
  const v6 = this.informe!.pasos.find(p => p.id === 'V6')!;
  assert.match(v6.detalle, new RegExp(regla));
});
Then('el registro respondió {string} a la reentrega del evento {string}', function (this: Mundo, estado: string, e: string) {
  const rs = this.respuestas.get(this.ultimaTx)!.filter(r => r.e === e);
  assert.ok(rs.length >= 2, 'no hubo reentrega');
  assert.equal(rs[1].estado, estado);
});
Then('el registro responde {string}', function (this: Mundo, estado: string) {
  assert.equal(this.ultimaRespuesta!.estado, estado, this.ultimaRespuesta!.motivo);
});
Then('el registro respondió {string} al evento {string}', function (this: Mundo, estado: string, e: string) {
  assert.equal(this.respuestas.get(this.ultimaTx)!.find(r => r.e === e)!.estado, estado);
});
Then('al llegar {string} el registro aceptó también {string}', function (this: Mundo, a: string, b: string) {
  const r = this.respuestas.get(this.ultimaTx)!.find(x => x.e === a)!;
  assert.equal(r.estado, 'ACEPTADO');
  assert.ok(r.liberados?.includes(b));
});
Then('el registro respondió {string} y después notificó {string} para el evento {string}', function (this: Mundo, primero: string, despues: string, e: string) {
  assert.equal(this.respuestas.get(this.ultimaTx)!.find(r => r.e === e)!.estado, primero);
  assert.ok(this.registro.incidencias.some(i => i.e === e && i.estado === despues));
});
Then('el registro notificó como incidencia por plazo los eventos {string}', function (this: Mundo, eventos: string) {
  const inc = this.registro.incidencias.filter(i => i.motivo.includes('plazo')).map(i => i.e!).sort();
  assert.deepEqual(inc, lista(eventos).sort());
});
Then('el cierre termina con un error controlado', function (this: Mundo) {
  assert.equal(this.cierre?.ok, false);
});
Then('el contenido completo del registro no incluye ninguno de los datos de negocio emitidos', function (this: Mundo) {
  const v = this.registro.volcado();
  const filtrados = this.datosEmitidos.filter(x => v.includes(x) || v.includes(Buffer.from(x).toString('hex')));
  const terminos = ['origen=', 'destino=', 'importe', '500000', 'EUR', 'riesgo='].filter(x => v.includes(x));
  assert.deepEqual([...filtrados, ...terminos], []);
});
Then('recupera {string} en {int} intentos', function (this: Mundo, valor: string, n: number) {
  assert.equal(this.diccionario!.recuperado, valor);
  assert.equal(this.diccionario!.intentos, n);
});
Then('la raíz es {string}', function (this: Mundo, h: string) {
  assert.equal(hex(this.raizVacia!), h);
});
Then('no existe prueba de inclusión para ese periodo', function (this: Mundo) {
  assert.equal(this.pruebaVacia, undefined);
});
Then(/^el resumen d\(E1\) de "([^"]+)" es "([0-9a-f]+)"$/, function (this: Mundo, t: string, h: string) {
  assert.equal(hex(d(this.emitidas.get(t)!.get('E1')!.E)), h);
});
Then('el valor inicial A₀ de {string} empieza por {string}', function (this: Mundo, t: string, h: string) {
  assert.ok(hex(A0(t)).startsWith(h));
});
Then('el valor acumulado final de cada transacción es:', function (this: Mundo, tabla: DataTable) {
  for (const f of tabla.hashes()) assert.equal(hex(this.K.get(f['transacción'])!.A), f['A₅'], f['transacción']);
});
Then('la raíz que conserva el testigo para {string} es {string}', function (this: Mundo, p: string, h: string) {
  assert.equal(hex(this.testigo.raiz(p)!), h);
});
Then('la prueba de inclusión de {string} tiene {int} resúmenes', function (this: Mundo, t: string, n: number) {
  assert.equal(this.anclajes.get(this.periodoDe.get(t)!)!.pruebas[t].length, n);
});

export type { Registro };
