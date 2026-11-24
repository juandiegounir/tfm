/**
 * Pasos del ejemplo resuelto (apartados 4.3.2 a 4.3.6 del trabajo): comprueban cada valor intermedio
 * del caso de estudio. Las codificaciones de campo, los nodos del árbol y el recorrido de la prueba de
 * inclusión se recalculan aquí a partir de las ecuaciones, de forma independiente de marco.ts, y se
 * contrastan con lo que producen los componentes del marco.
 */
import assert from 'node:assert/strict';
import { DataTable, Then } from '@cucumber/cucumber';
import {
  A0,
  Bytes,
  C,
  EventoVerificable,
  H,
  Informe,
  Kbytes,
  MTH,
  PasoVerificacion,
  acc,
  cat,
  comprobarFirma,
  cuerpo,
  d,
  hex,
} from '../../src/marco.ts';
import { Mundo } from '../soporte/mundo.ts';

const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
/** L(x) de la ecuación 2: longitud en cuatro bytes (big-endian) seguida de los bytes de x. */
const L = (x: Bytes) => cat(u32(x.length), x);
const txt = (x: string) => Buffer.from(x, 'utf8');
const hoja = (K: Bytes) => H(cat(Buffer.from([0x00]), K));
const nodo = (a: Bytes, b: Bytes) => H(cat(Buffer.from([0x01]), a, b));
const cadena = (t: string, ev: readonly EventoVerificable[]) => ev.reduce((a, E) => acc(a, d(E)), A0(t));

function evento(w: Mundo, t: string, e: string): EventoVerificable {
  return w.historial(t)[w.posicion(t, e)][0];
}
function puntoReferencia(w: Mundo, t: string) {
  const K = w.K.get(t);
  assert.ok(K, `no hay punto de referencia de ${t}`);
  return K;
}

// ---------------------------------------------------------------- 4.3.2
Then('el resumen c de los datos del evento {string} de {string} es {string}', function (this: Mundo, e: string, t: string, h: string) {
  const E = evento(this, t, e);
  const datos = this.servicio(E.s).datos(t, e);
  assert.ok(datos !== undefined, `el servicio ${E.s} no conserva los datos de ${e}`);
  assert.equal(hex(H(txt(datos))), h);
  assert.equal(hex(E.c), h);
});
Then('la codificación canónica C\\(E1) de {string} tiene {int} bytes con estos campos:', function (this: Mundo, t: string, n: number, tabla: DataTable) {
  const E = evento(this, t, 'E1');
  const refs = cat(u32(E.P.length), ...[...E.P].sort((x, y) => Buffer.compare(x, y)));
  const campos: Record<string, Bytes> = {
    t: L(txt(E.t)), e: L(txt(E.e)), s: L(txt(E.s)), τ: L(txt(E.tau)), k: L(txt(E.k)),
    a: L(txt(String(E.a))), P: L(refs), c: L(E.c),
  };
  const filas = tabla.hashes();
  for (const f of filas) {
    const campo = campos[f.campo];
    assert.ok(campo, `campo desconocido ${f.campo}`);
    assert.equal(hex(campo, 1000), f['L(x)'], `L(${f.campo})`);
    assert.equal(campo.length, Number(f.bytes), `bytes de ${f.campo}`);
  }
  const concatenacion = cat(...filas.map(f => campos[f.campo]));
  assert.ok(concatenacion.equals(C(E)), 'la concatenación de los campos no coincide con C(E1) del marco');
  assert.equal(C(E).length, n);
});
Then('la entrada «EVT» || C\\(E1) tiene {int} bytes', function (this: Mundo, n: number) {
  assert.equal(cat(txt('EVT'), C(evento(this, 'TX-2026-000123', 'E1'))).length, n);
});

// ---------------------------------------------------------------- 4.3.4
Then('la cadena de acumulación de {string} es:', function (this: Mundo, t: string, tabla: DataTable) {
  const R = this.historial(t);
  for (const f of tabla.hashes()) {
    const i = Number(f.i);
    if (i === 0) {
      assert.equal(hex(A0(t)), f['Aᵢ'], 'A₀');
      continue;
    }
    const [E, , A] = R[i - 1];
    assert.equal(E.e, f.evento, `evento ${i}`);
    assert.equal(hex(d(E)), f['d(Eᵢ)'], `d(${E.e})`);
    // el valor que guarda el registro coincide con la ecuación 5 aplicada al valor anterior
    const anterior = i === 1 ? A0(t) : R[i - 2][2];
    assert.ok(acc(anterior, d(E)).equals(A), `A${i} no sigue la ecuación 5`);
    assert.equal(hex(A), f['Aᵢ'], `A${i}`);
  }
});
Then('con los datos {string} en {string} de {string}, d\\(E3) empieza por {string} y el valor acumulado recalculado por {string}', function (this: Mundo, datos: string, e: string, t: string, dE: string, An: string) {
  const ev = this.historial(t).map(r => r[0]);
  const i = ev.findIndex(E => E.e === e);
  const mod = { ...ev[i], c: H(txt(datos)) };
  assert.ok(hex(d(mod)).startsWith(dE));
  assert.ok(hex(cadena(t, ev.map((E, j) => (j === i ? mod : E)))).startsWith(An));
});
Then('sin el evento {string} de {string}, el valor acumulado de los cuatro restantes empieza por {string}', function (this: Mundo, e: string, t: string, An: string) {
  const ev = this.historial(t).map(r => r[0]).filter(E => E.e !== e);
  assert.equal(ev.length, 4);
  assert.ok(hex(cadena(t, ev)).startsWith(An));
});
Then('con {string} y {string} de {string} registrados en orden inverso, el valor acumulado empieza por {string}', function (this: Mundo, a: string, b: string, t: string, An: string) {
  const ev = this.historial(t).map(r => r[0]);
  const i = ev.findIndex(E => E.e === a), j = ev.findIndex(E => E.e === b);
  [ev[i], ev[j]] = [ev[j], ev[i]];
  assert.ok(hex(cadena(t, ev)).startsWith(An));
});

// ---------------------------------------------------------------- 4.3.5
Then('la clave pública del servicio {string} empieza por {string}', function (this: Mundo, s: string, h: string) {
  const pk = this.dir.get(s);
  assert.ok(pk, `${s} no está en el directorio`);
  const der = pk.export({ format: 'der', type: 'spki' });
  assert.ok(hex(der.subarray(der.length - 32)).startsWith(h));
});
Then('la firma σ del evento {string} de {string} empieza por {string} y es válida con esa clave', function (this: Mundo, e: string, t: string, h: string) {
  const [E, sigma] = this.historial(t)[this.posicion(t, e)];
  assert.ok(hex(sigma, 128).startsWith(h));
  assert.equal(comprobarFirma(this.dir, E.s, d(E), sigma), 'VÁLIDA');
});
Then('el cuerpo firmado del punto de referencia de {string} tiene {int} bytes', function (this: Mundo, t: string, n: number) {
  const K = puntoReferencia(this, t);
  assert.equal(cuerpo(K.t, K.n, K.A).length, n);
});
Then('la firma σ_R del punto de referencia de {string} es {string}', function (this: Mundo, t: string, h: string) {
  assert.equal(hex(puntoReferencia(this, t).sigR, 128), h);
});
Then('el punto de referencia K_t de {string} ocupa {int} bytes y es {string}', function (this: Mundo, t: string, n: number, h: string) {
  const K = Kbytes(puntoReferencia(this, t));
  assert.equal(K.length, n);
  assert.equal(hex(K, 1000), h);
});
function hojasPeriodo(w: Mundo, p: string): Bytes[] {
  const txs = w.txsPeriodo.get(p);
  assert.ok(txs, `periodo ${p} no anclado`);
  return txs.map(t => Kbytes(puntoReferencia(w, t)));
}
Then('las hojas del árbol del periodo {string} son:', function (this: Mundo, p: string, tabla: DataTable) {
  const txs = this.txsPeriodo.get(p) ?? [];
  const K = hojasPeriodo(this, p);
  tabla.hashes().forEach((f, i) => {
    assert.equal(txs[i], f['transacción'], `hoja ${i + 1}`);
    assert.equal(hex(hoja(K[i])), f['hᵢ'], f['transacción']);
  });
});
Then('los nodos internos del periodo {string} son:', function (this: Mundo, p: string, tabla: DataTable) {
  const K = hojasPeriodo(this, p);
  for (const f of tabla.hashes()) {
    const [a, b] = f.hojas.split('-').map(Number);
    assert.equal(hex(MTH(K.slice(a - 1, b))), f.valor, f.nodo);
  }
});
Then('la prueba de inclusión de {string} está formada por:', function (this: Mundo, t: string, tabla: DataTable) {
  const pr = this.anclajes.get(this.periodoDe.get(t) ?? '')?.pruebas[t];
  assert.ok(pr, `no hay prueba de inclusión de ${t}`);
  const filas = tabla.hashes();
  assert.equal(pr.length, filas.length);
  filas.forEach((f, i) => {
    assert.equal(pr[i].izq ? 'izquierda' : 'derecha', f.lado, f.hermano);
    assert.equal(hex(pr[i].h), f.resumen, f.hermano);
  });
});

// ---------------------------------------------------------------- 4.3.6
Then('al recorrer la prueba de inclusión de {string} se obtiene:', function (this: Mundo, t: string, tabla: DataTable) {
  const p = this.periodoDe.get(t) ?? '';
  const pr = this.anclajes.get(p)?.pruebas[t];
  assert.ok(pr);
  const xs = [hoja(Kbytes(puntoReferencia(this, t)))];
  for (const s of pr) {
    const x = xs[xs.length - 1];
    xs.push(s.izq ? nodo(s.h, x) : nodo(x, s.h));
  }
  const filas = tabla.hashes();
  assert.equal(xs.length, filas.length);
  filas.forEach((f, i) => { assert.equal(hex(xs[i]), f.valor, f.x); });
  const raiz = this.testigo.raiz(p);
  assert.ok(raiz && xs[xs.length - 1].equals(raiz), 'el recorrido no termina en la raíz del testigo');
});
Then('los pasos del verificador terminan así:', function (this: Mundo, tabla: DataTable) {
  const inf: Informe | undefined = this.informe;
  assert.ok(inf, 'no se ha ejecutado el verificador');
  for (const f of tabla.hashes()) {
    const paso: PasoVerificacion | undefined = inf.pasos.find(x => x.id === f.paso);
    assert.ok(paso, `falta el paso ${f.paso}`);
    assert.equal(paso.estado, f.estado, f.paso);
    if (f['detalle contiene']) assert.ok(paso.detalle.includes(f['detalle contiene']), `${f.paso}: ${paso.detalle}`);
  }
});
