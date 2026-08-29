// Katman import kuralları — ARCHITECTURE.md §1: import yalnızca aşağı doğru.
// Bir katmanın yasaklı katmanı import etmesi lint hatasıdır.
const layerRule = (forbidden) => ({
  'no-restricted-imports': ['error', {
    patterns: forbidden.map((l) => ({
      group: [`**/${l}/**`],
      message: `Bu katman '${l}' katmanını import edemez (ARCHITECTURE.md §1).`,
    })),
  }],
});

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  { files: ['src/core/**'], rules: layerRule(['data', 'sim', 'input', 'render', 'ui', 'app']) },
  { files: ['src/data/**'], rules: layerRule(['core', 'sim', 'input', 'render', 'ui', 'app']) },
  { files: ['src/sim/**'], rules: layerRule(['input', 'render', 'ui', 'app']) },
  { files: ['src/input/**'], rules: layerRule(['render', 'ui', 'app']) },
  { files: ['src/render/**'], rules: layerRule(['ui', 'app', 'input']) },
  { files: ['src/ui/**'], rules: layerRule(['app']) },
];
