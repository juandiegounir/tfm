# Implementación independiente en Python (RNF-01)

Implementación mínima del modelo criptográfico del marco, escrita a partir de las ecuaciones del apartado 4.3 del trabajo y no a partir del código TypeScript. Sirve para comprobar el requisito RNF-01: dos implementaciones independientes deben obtener los mismos resúmenes y firmas.

| Fichero | Contenido |
|---|---|
| `marco.py` | Codificación canónica (ec. 2), resumen del evento (ec. 3), acumulación (ec. 4 y 5), firmas Ed25519 (ec. 6), punto de referencia (ec. 8) y raíz de Merkle de RFC 9162 con su prueba de inclusión (ec. 9 y 10). |
| `vectores.py` | Reconstruye las cinco transacciones del periodo del caso de estudio y compara 40 valores con los que exporta el prototipo TypeScript en `../prototipo/vectores/vectores.json`. |
| `resultados.txt` | Salida de la comparación documentada. |

## Reproducción

Requisitos: Python 3.10 o superior. SHA-256 procede de `hashlib` (biblioteca estándar) y Ed25519 de `cryptography`.

```bash
python -m pip install -r requirements.txt
python vectores.py      # 40/40 valores idénticos; termina con código 1 si alguno difiere
```

Para regenerar los vectores del lado TypeScript: `cd ../prototipo && npm install && npm run vectores`.

Ejecución documentada: Python 3.13.18 y cryptography 50.0.1, frente a Node.js 22.23.5.
