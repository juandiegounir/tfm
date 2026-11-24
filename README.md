# tfm

[![pruebas](https://github.com/juandiegounir/tfm/actions/workflows/pruebas.yml/badge.svg)](https://github.com/juandiegounir/tfm/actions/workflows/pruebas.yml)

Repositorio de código del Trabajo Fin de Máster «Marco metodológico para la verificación criptográfica de la integridad y el orden de eventos en transacciones distribuidas con microservicios» (Máster Universitario en Ingeniería de Software y Sistemas Informáticos, UNIR).

Autor: Juan Diego Medina Rojas.

El documento del trabajo no reproduce código: cita los ficheros de este repositorio. La evaluación del trabajo y su ejemplo resuelto son pruebas ejecutables, y su informe es la evidencia de los resultados.

## Contenido

```
.github/workflows/pruebas.yml   Integración continua en Linux, Windows y macOS
prototipo/                      Prototipo de referencia en TypeScript (Node.js 22)
  src/                          Marco (algoritmos 1–4 y autómata M) y programa de evaluación
  e2e/                          Pruebas de extremo a extremo en Gherkin (Cucumber)
  informes/                     Informe y resumen de la última ejecución documentada de las pruebas E2E
  resultados/                   Resultados del programa de evaluación
  vectores/                     Vectores del caso de estudio para la comparación con Python
python/                         Implementación independiente del modelo criptográfico (RNF-01)
figuras/                        Fuentes y renderizados de las figuras del trabajo
```

| Parte del trabajo | Dónde está en el repositorio |
|---|---|
| Modelo criptográfico (apartado 4.3, ecuaciones 1–10): cada ecuación con su función, uso y prueba | [`prototipo/MODELO.md`](prototipo/MODELO.md), sobre [`prototipo/src/marco.ts`](prototipo/src/marco.ts) y [`python/marco.py`](python/marco.py) |
| Ejemplo resuelto del caso de estudio (apartados 4.3.2–4.3.6, tabla 10) | [`prototipo/e2e/caracteristicas/08-ejemplo-resuelto.feature`](prototipo/e2e/caracteristicas/08-ejemplo-resuelto.feature) |
| Algoritmos 1–4 y autómata M (apartados 4.3.3 y 4.4.1): del pseudocódigo al código | [`prototipo/MODELO.md#algoritmos`](prototipo/MODELO.md#algoritmos) |
| Escenarios y pruebas de la evaluación (apartado 4.5, tablas 11–13) | [`prototipo/e2e/caracteristicas/`](prototipo/e2e/caracteristicas) y [`prototipo/src/evaluacion.ts`](prototipo/src/evaluacion.ts) |
| Comparación entre lenguajes (RNF-01, tabla 14) | [`python/vectores.py`](python/vectores.py) |
| Figuras 2 y 3 | [`figuras/`](figuras) |

## Reproducción

Requisitos: Node.js 22 o superior y Python 3.10 o superior.

```bash
cd prototipo
npm install
npm run probar       # tipos, ESLint, 50/50 escenarios E2E y 55/55 casos de la evaluación
npm run vectores
cd ../python
python -m pip install -r requirements.txt
python vectores.py   # 40/40 valores idénticos a los de TypeScript
```

El informe completo de las pruebas queda en `prototipo/informes/e2e.html`. Los detalles están en [`prototipo/README.md`](prototipo/README.md) y [`python/README.md`](python/README.md).

## Calidad del código

- **Tipos**: TypeScript en modo estricto (`npm run tipos`).
- **Análisis estático**: ESLint con typescript-eslint en sus conjuntos `strictTypeChecked` y `stylisticTypeChecked` (`npm run lint`), y Ruff para Python (`ruff check` y `ruff format --check`).
- **Pruebas**: 50 escenarios de extremo a extremo en Gherkin, el programa de evaluación con 55 casos y la comparación de 40 vectores entre TypeScript y Python.
- **Integración continua**: [`.github/workflows/pruebas.yml`](.github/workflows/pruebas.yml) ejecuta todo lo anterior en cada push en Linux, Windows y macOS y publica los informes como artefactos.

Las claves Ed25519 del prototipo son claves de demostración derivadas de una semilla fija: sirven solo para reproducir los valores del documento y no deben usarse fuera de este contexto.
