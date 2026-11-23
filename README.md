# tfm

Repositorio de código del Trabajo Fin de Máster «Marco metodológico para la verificación determinista de transacciones distribuidas mediante un modelo de acumulación criptográfico de estado en microservicios» (Máster Universitario en Ingeniería de Software y Sistemas Informáticos, UNIR).

Autor: Juan Diego Medina Rojas.

## Contenido

| Carpeta | Descripción |
|---|---|
| [`prototipo/`](prototipo) | Prototipo de referencia en TypeScript (Node.js 22): servicio emisor, registro de evidencias, testigo externo y verificador (algoritmos 1 a 4 y autómata M del capítulo 4). Incluye la evaluación de los escenarios de las tablas 11 y 12 y los resultados obtenidos. |

## Reproducción rápida

```bash
cd prototipo
npm install
npm run evaluar   # 55/55 casos con el resultado esperado
```

En [`prototipo/README.md`](prototipo/README.md) están los detalles de la reproducción y de las reglas implementadas.

Las claves Ed25519 del prototipo son claves de demostración derivadas de una semilla fija: sirven solo para reproducir los valores del documento y no deben usarse fuera de este contexto.
