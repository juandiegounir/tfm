# tfm

[![pruebas](https://github.com/juandiegounir/tfm/actions/workflows/pruebas.yml/badge.svg)](https://github.com/juandiegounir/tfm/actions/workflows/pruebas.yml)

Repositorio de código del Trabajo Fin de Máster «Marco metodológico para la verificación criptográfica de la integridad y el orden de eventos en transacciones distribuidas con microservicios» (Máster Universitario en Ingeniería de Software y Sistemas Informáticos, UNIR).

Autor: Juan Diego Medina Rojas.

## Contenido

| Carpeta | Descripción |
|---|---|
| [`prototipo/`](prototipo) | Prototipo de referencia en TypeScript (Node.js 22): servicio emisor, registro de evidencias, testigo externo y verificador (algoritmos 1 a 4 y autómata M del capítulo 4). Incluye la evaluación de los escenarios y pruebas del apartado 4.5 y los resultados obtenidos. |
| [`python/`](python) | Implementación mínima independiente en Python del modelo criptográfico, que reproduce los vectores del caso de estudio (RNF-01). |
| [`prototipo/e2e/`](prototipo/e2e) | Pruebas de extremo a extremo en Gherkin (español) ejecutadas con Cucumber: 44 escenarios que recorren emisión, registro, anclaje, ataque y verificación, enlazados con requisitos, amenazas y supuestos mediante etiquetas. |
| [`.github/workflows/pruebas.yml`](.github/workflows/pruebas.yml) | Integración continua: en cada push ejecuta tipos, pruebas E2E, evaluación y comparación TypeScript–Python en Linux, Windows y macOS, y publica los informes. |
| [`figuras/`](figuras) | Fuentes y renderizados de las figuras del documento (integración con Saga y Transactional Outbox, informe de las pruebas E2E). |

## Reproducción rápida

```bash
cd prototipo
npm install
npm run e2e       # 44/44 escenarios E2E (informe en informes/e2e.html)
npm run evaluar   # 55/55 casos con el resultado esperado
npm run vectores
cd ../python
python -m pip install -r requirements.txt
python vectores.py   # 40/40 valores idénticos a los de TypeScript
```

En [`prototipo/README.md`](prototipo/README.md) están los detalles de la reproducción y de las reglas implementadas.

Las claves Ed25519 del prototipo son claves de demostración derivadas de una semilla fija: sirven solo para reproducir los valores del documento y no deben usarse fuera de este contexto.
