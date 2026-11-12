const { resolve } = require('node:path')

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: resolve(__dirname, 'tsconfig.eslint.json'),
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  // Formatting is handled by Prettier on demand (`npm run format`); ESLint
  // only disables style rules that would clash with it, so manually wrapped
  // code (e.g. multi-line parameter lists) is not reported as a lint error.
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.cjs', 'dist/**'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-underscore-dangle': 'off',
    'no-console': 'off',
    'max-len': 0,
    'linebreak-style': 'off',
  },
  overrides: [
    {
      // Plain CommonJS scripts (migrations, helpers) are not modules.
      files: ['**/*.js', '**/*.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
