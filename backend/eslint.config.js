import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'logs/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // The backend is not strict TypeScript yet, so `any` is still common.
      // The rule is on as a warning so the count is visible and can only
      // go down.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      // The Express error handler must keep the four argument signature, and
      // the `next` parameter is unused by design.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', args: 'after-used' },
      ],
    },
  },
  {
    // The Express request augmentation uses the documented global namespace.
    files: ['types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // The test scripts are plain JavaScript run by node.
    files: ['tests/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
