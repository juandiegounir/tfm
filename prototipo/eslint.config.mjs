// Análisis estático del prototipo con ESLint y typescript-eslint.
// Usa las reglas recomendadas con información de tipos (strictTypeChecked) y las de estilo
// (stylisticTypeChecked), que aprovechan el compilador para detectar promesas sin esperar,
// conversiones inseguras, condiciones siempre verdaderas o código inalcanzable.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'informes/', 'resultados/', 'vectores/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Los números en plantillas de texto son habituales en los mensajes del verificador.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // En los pasos de las pruebas, un valor ausente debe hacer fallar la prueba en el acto:
    // la aserción no nula expresa esa precondición del escenario.
    files: ['e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
