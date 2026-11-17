import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results', 'src/types/schema.d.ts'] },
  {
    // Type-aware rules: they read the TS program, so they catch things like
    // a forgotten `await` or a promise passed where a callback is expected.
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked, jsxA11y.flatConfigs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
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
      // Matches tsconfig's noUnusedParameters convention (which already
      // treats a leading underscore as "intentionally unused").
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Fire-and-forget is fine for invalidateQueries and toasts; a floating
      // promise that can reject is still caught by no-floating-promises
      // below, which allows `void`.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      // The API layer returns JSON typed at the call site; these flag every
      // generated-schema `unknown` field and add noise, not safety.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // A deliberate autofocus on the first field of a dialog is good UX.
      'jsx-a11y/no-autofocus': 'off',
      // Our checkbox labels nest their text a couple of spans deep.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
  {
    // Config and test files outside the app's TS project.
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['*.{js,ts}', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
)
