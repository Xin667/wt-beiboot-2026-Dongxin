import js from '@eslint/js';
import globals from 'globals';

/**
 * ESLint-Konfiguration (Flat Config, ESLint 9).
 *
 * Bewusst schlank: @eslint/js recommended + Browser-Globals für src/ und
 * Node-Globals für test/. Kein Code-Style-Zwang – nur Regeln, die echte
 * Probleme finden (undefined Variablen, ungenutzte Variablen, etc.).
 *
 * Das ist die einzige devDependency der Library (siehe README): Zur Laufzeit
 * bleibt die Library dependency-frei, ESLint läuft nur lokal/in CI.
 */
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
