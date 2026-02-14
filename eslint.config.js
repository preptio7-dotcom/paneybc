const tsParser = require('@typescript-eslint/parser')

module.exports = [
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {},
  },
]
