// Configuración de Cucumber para las pruebas de extremo a extremo (e2e/).
export default {
  paths: ['e2e/caracteristicas/**/*.feature'],
  import: ['e2e/soporte/**/*.ts', 'e2e/pasos/**/*.ts'],
  language: 'es',
  format: [
    'progress-bar',
    'summary',
    'html:informes/e2e.html',
    'junit:informes/e2e.xml',
    'json:informes/e2e.json',
  ],
  formatOptions: { snippetInterface: 'synchronous' },
  strict: true,
};
