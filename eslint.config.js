// Flat-config (eslint 9). Mirrors what `npm create vite@latest` scaffolds
// for a React-TS project: typescript-eslint recommended rules, the React
// hooks plugin (catches stale-closure bugs), and the React-refresh plugin
// that warns when a file exports both a component and a non-component
// (which breaks fast-refresh).
//
// Build outputs and the eDirect tooling are excluded — the latter is a
// loose Python + Node grab-bag whose .mjs scripts predate this config.

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      'graphify-out/**',
      'vite.config.ts',
      'vitest.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // The codebase uses `_var` to mark deliberately unused params.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // PDF / Drive / Firestore boundaries hand us untyped payloads; cast
      // discipline lives in the touched code, not a blanket rule.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
