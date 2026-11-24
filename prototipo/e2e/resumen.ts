/**
 * Resume el informe JSON de Cucumber (informes/e2e.json) en una tabla Markdown por característica
 * y escenario, con sus etiquetas de trazabilidad (requisitos, amenazas, supuestos) y su estado.
 * Termina con código 1 si algún escenario no pasa.
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Paso { result: { status: string } }
interface Elemento { name: string; type: string; tags?: { name: string }[]; steps: Paso[] }
interface Caracteristica { name: string; uri: string; tags?: { name: string }[]; elements: Elemento[] }

const informe: Caracteristica[] = JSON.parse(readFileSync('informes/e2e.json', 'utf8'));
const filas: string[] = [];
let total = 0, pasan = 0, pasos = 0;
for (const c of informe) {
  for (const e of c.elements.filter(x => x.type === 'scenario')) {
    total++;
    pasos += e.steps.length;
    const ok = e.steps.every(s => s.result.status === 'passed');
    if (ok) pasan++;
    const tags = (e.tags ?? []).map(t => t.name.slice(1)).filter(t => !t.startsWith('tabla')).join(' ');
    filas.push(`| ${c.uri.split('/').pop()} | ${e.name} | ${tags} | ${e.steps.length} | ${ok ? 'pasa' : 'FALLA'} |`);
  }
}
const md = [
  `# Resumen de las pruebas de extremo a extremo`,
  ``,
  `${pasan}/${total} escenarios pasan (${pasos} pasos). Informe completo: informes/e2e.html.`,
  ``,
  `| Característica | Escenario | Trazabilidad | Pasos | Estado |`,
  `|---|---|---|---|---|`,
  ...filas,
];
writeFileSync('informes/resumen.md', md.join('\n') + '\n');
console.log(`${pasan}/${total} escenarios pasan (${pasos} pasos). Resumen en informes/resumen.md`);
process.exit(pasan === total ? 0 : 1);
