"""
Reproduce en Python los vectores del caso de estudio y los compara con los que exporta el
prototipo TypeScript (../prototipo/vectores/vectores.json). Termina con código 1 si algún
valor no coincide.

Ejecución:  python -m pip install -r requirements.txt  &&  python vectores.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from marco import (
    MTH,
    Evento,
    Historial,
    PuntoReferencia,
    clave_demo,
    comprobar_inclusion,
    firmar,
    prueba_inclusion,
    publica,
    verificar_firma,
    H,
)

SERVICIOS = ["orquestador", "cuentas", "antifraude", "registro"]
SK = {s: clave_demo(s) for s in SERVICIOS}
PK = {s: publica(k) for s, k in SK.items()}

D_E1 = "origen=0001;destino=0002;importe=500000;moneda=EUR"
D_E4 = "debito=0001;abono=0002;importe=500000;resultado=ok"
# (e, servicio, tipo, clave, intento, dependencias, datos de negocio)
E1 = ("E1", "orquestador", "INICIO", "op-1", 1, [], D_E1)
E2 = ("E2", "cuentas", "FONDOS_OK", "op-2", 1, ["E1"], "resultado=ok;saldo_suficiente=si")


def e3(e="E3", a=1):
    return (e, "antifraude", "AUTORIZACION_OK", "op-3", a, ["E1"], "resultado=aprobada;riesgo=0.12")


def e4(u="E3"):
    return ("E4", "cuentas", "EJECUCION_OK", "op-4", 1, ["E2", u], D_E4)


E5 = ("E5", "orquestador", "CONFIRMACION", "op-5", 1, ["E4"], "estado=confirmada")


def reverso(indebido: bool):
    e4r = (
        ("E4", "cuentas", "EJECUCION_OK", "op-4", 1, ["E2", "E3"], "debito=0001;abono=0002;resultado=ok")
        if indebido
        else ("E4", "cuentas", "EJECUCION_FALLO", "op-4", 1, ["E2", "E3"], "abono=rechazado_por_entidad_destino")
    )
    return [
        E1,
        ("E2", "cuentas", "FONDOS_OK", "op-2", 1, ["E1"], "resultado=ok;retencion=500000"),
        e3(),
        e4r,
        ("E5", "cuentas", "COMPENSACION", "op-6", 1, ["E2", "E4"], "liberacion_retencion=500000"),
    ]


TRANSACCIONES = [
    ("TX-2026-000123", [E1, E2, e3(), e4(), E5], None),
    ("TX-2026-000124", [E1, E2, e3(), e3("E3b", 2), e4("E3b"), E5], ["E1", "E2", "E3", "E3", "E3b", "E4", "E5"]),
    ("TX-2026-000125", reverso(False), None),
    ("TX-2026-000126", [E1, E2, e3(), e3("E3d", 1), e4(), E5], None),
    ("TX-2026-000127", reverso(True), None),
]


def construir():
    historiales: dict[str, Historial] = {}
    eventos_123 = []
    for t, specs, entrega in TRANSACCIONES:
        ev: dict[str, tuple[Evento, bytes]] = {}
        for e, s, tau, k, a, deps, datos in specs:
            E = Evento(t, e, s, tau, k, a, tuple(ev[x][0].d() for x in deps), H(datos.encode("utf-8")))
            ev[e] = (E, firmar(SK[s], E.d()))
            if t == "TX-2026-000123":
                eventos_123.append(ev[e])
        h = Historial(t)
        for e in entrega or [x[0] for x in specs]:
            h.registrar(*ev[e])
        historiales[t] = h
    K = {}
    for t, h in historiales.items():
        k = PuntoReferencia(t, len(h.eventos), h.A[-1])
        k.sigR = firmar(SK["registro"], k.cuerpo())
        K[t] = k
    hojas = [K[t].bytes() for t, _, _ in TRANSACCIONES]
    return historiales, eventos_123, K, hojas


def main() -> int:
    ruta = Path(__file__).resolve().parent.parent / "prototipo" / "vectores" / "vectores.json"
    ts = json.loads(ruta.read_text(encoding="utf-8"))
    historiales, ev123, K, hojas = construir()
    raiz = MTH(hojas)
    pr = prueba_inclusion(hojas, 0)

    filas: list[tuple[str, str, str]] = []

    def comparar(nombre: str, py: bytes | str, tsv: str) -> None:
        v = py.hex() if isinstance(py, bytes) else py
        filas.append((nombre, v, tsv))

    for s in SERVICIOS:
        comparar(f"pk({s})", PK[s], ts["claves_publicas"][s])
    for (E, sigma), te in zip(ev123, ts["eventos"]):
        comparar(f"c de {E.e}", E.c, te["c"])
        comparar(f"C({E.e})", E.C(), te["C"])
        comparar(f"d({E.e})", E.d(), te["d"])
        comparar(f"σ de {E.e}", sigma, te["sigma"])
    for i, a in enumerate(historiales["TX-2026-000123"].A):
        comparar(f"A{i}", a, ts["A"][i])
    k = K["TX-2026-000123"]
    comparar("σ_R de K_t", k.sigR, ts["K"]["sigR"])
    comparar("K_t (bytes)", k.bytes(), ts["K"]["bytes"])
    for t in K:
        comparar(f"A₅ de {t}", K[t].A, ts["A5"][t])
    comparar("Raíz del periodo", raiz, ts["raiz"])
    comparar("Prueba de inclusión", ";".join(("I" if izq else "D") + h.hex() for izq, h in pr),
             ";".join(("I" if p["izq"] else "D") + p["h"] for p in ts["prueba"]))
    comparar("MTH de un periodo vacío", MTH([]), ts["mth_vacio"])

    # comprobaciones funcionales con valores calculados en Python
    ok_firmas = all(verificar_firma(PK[E.s], E.d(), s) for E, s in ev123)
    ok_inclusion = comprobar_inclusion(k.bytes(), pr, raiz)

    fallos = 0
    print(f"{'Valor':<26} {'Python':<18} {'TypeScript':<18} Coincide")
    for nombre, py, tsv in filas:
        igual = py == tsv
        fallos += not igual
        print(f"{nombre:<26} {py[:16]:<18} {tsv[:16]:<18} {'sí' if igual else 'NO'}")
    print(f"\nFirmas de TX-2026-000123 verificadas en Python: {'sí' if ok_firmas else 'NO'}")
    print(f"Inclusión de K_t en la raíz verificada en Python: {'sí' if ok_inclusion else 'NO'}")
    print(f"{len(filas) - fallos}/{len(filas)} valores idénticos.")
    return 0 if fallos == 0 and ok_firmas and ok_inclusion else 1


if __name__ == "__main__":
    sys.exit(main())
