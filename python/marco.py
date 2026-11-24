"""
Implementación mínima e independiente del modelo criptográfico del marco en Python.

Se escribe a partir de las ecuaciones del apartado 4.3 del trabajo, no a partir del
código TypeScript, para comprobar que la representación de los eventos no depende del
lenguaje (RNF-01). Cubre la codificación canónica (ec. 2), el resumen del evento (ec. 3),
la cadena de acumulación (ec. 4 y 5), las firmas Ed25519 (ec. 6), el punto de referencia
(ec. 8) y la raíz de Merkle de RFC 9162 con su prueba de inclusión (ec. 9 y 10).

SHA-256 procede de hashlib (biblioteca estándar) y Ed25519 de la biblioteca cryptography.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def H(b: bytes) -> bytes:
    """Función hash H (SHA-256)."""
    return hashlib.sha256(b).digest()


def L(x: bytes) -> bytes:
    """L(x): longitud de x como entero sin signo de 4 bytes (big-endian) seguida de x."""
    return len(x).to_bytes(4, "big") + x


def texto(v: str | int) -> bytes:
    return str(v).encode("utf-8")


@dataclass(frozen=True)
class Evento:
    """Evento verificable E = (t, e, s, τ, k, a, P, c), ecuación 1."""

    t: str
    e: str
    s: str
    tau: str
    k: str
    a: int
    P: tuple[bytes, ...]
    c: bytes

    def C(self) -> bytes:
        """Codificación canónica, ecuación 2."""
        refs = len(self.P).to_bytes(4, "big") + b"".join(sorted(self.P))
        campos = [self.t, self.e, self.s, self.tau, self.k, self.a]
        return b"".join(L(texto(f)) for f in campos) + L(refs) + L(self.c)

    def d(self) -> bytes:
        """Resumen del evento, ecuación 3."""
        return H(b"EVT" + self.C())


def A0(t: str) -> bytes:
    """Valor inicial, ecuación 4."""
    return H(b"INI" + t.encode("utf-8"))


def acumular(A: bytes, dE: bytes) -> bytes:
    """Paso de acumulación, ecuación 5."""
    return H(b"ACU" + A + dE)


def clave_demo(nombre: str) -> Ed25519PrivateKey:
    """Clave de demostración: semilla de 32 bytes H(«clave-demo-» || nombre)."""
    return Ed25519PrivateKey.from_private_bytes(H(("clave-demo-" + nombre).encode("utf-8")))


def publica(sk: Ed25519PrivateKey) -> bytes:
    return sk.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)


def firmar(sk: Ed25519PrivateKey, m: bytes) -> bytes:
    """Firma Ed25519, ecuación 6 (determinista, RFC 8032)."""
    return sk.sign(m)


def verificar_firma(pk: bytes, m: bytes, sigma: bytes) -> bool:
    try:
        Ed25519PublicKey.from_public_bytes(pk).verify(sigma, m)
        return True
    except Exception:
        return False


@dataclass
class PuntoReferencia:
    """Punto de referencia K_t = (t, n, Aₙ, σ_R), ecuación 8."""

    t: str
    n: int
    A: bytes
    sigR: bytes = b""

    def cuerpo(self) -> bytes:
        return L(texto(self.t)) + L(texto(self.n)) + L(self.A)

    def bytes(self) -> bytes:
        return self.cuerpo() + L(self.sigR)


# ---------- árbol de Merkle de RFC 9162 (ecuaciones 9 y 10) ----------
def _k(m: int) -> int:
    k = 1
    while k * 2 < m:
        k *= 2
    return k


def MTH(D: list[bytes]) -> bytes:
    if not D:
        return H(b"")
    if len(D) == 1:
        return H(b"\x00" + D[0])
    k = _k(len(D))
    return H(b"\x01" + MTH(D[:k]) + MTH(D[k:]))


def prueba_inclusion(D: list[bytes], i: int) -> list[tuple[bool, bytes]]:
    """Ruta de auditoría de la hoja i: lista de (hermano_a_la_izquierda, resumen)."""
    if len(D) <= 1:
        return []
    k = _k(len(D))
    if i < k:
        return [*prueba_inclusion(D[:k], i), (False, MTH(D[k:]))]
    return [*prueba_inclusion(D[k:], i - k), (True, MTH(D[:k]))]


def comprobar_inclusion(hoja: bytes, prueba: list[tuple[bool, bytes]], raiz: bytes) -> bool:
    x = H(b"\x00" + hoja)
    for izq, h in prueba:
        x = H(b"\x01" + h + x) if izq else H(b"\x01" + x + h)
    return x == raiz


@dataclass
class Historial:
    """Historial de una transacción en el registro: eventos, firmas y valores acumulados."""

    t: str
    eventos: list[Evento] = field(default_factory=list)
    firmas: list[bytes] = field(default_factory=list)
    A: list[bytes] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.A = [A0(self.t)]

    def registrar(self, E: Evento, sigma: bytes) -> None:
        if any(x.e == E.e for x in self.eventos):  # reentrega idéntica: se ignora
            return
        self.eventos.append(E)
        self.firmas.append(sigma)
        self.A.append(acumular(self.A[-1], E.d()))
