module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    // fixable rules
    curly: [2, 'all'],
    quotes: [2, 'single', { avoidEscape: true }],
    'sort-imports': 0,
    'import/order': 0,
    'simple-import-sort/imports': 0,
    'simple-import-sort/exports': 0,
    'import/first': 2,
    'import/newline-after-import': 2,
    'import/no-duplicates': 2,
    'import/no-extraneous-dependencies': 2,
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/ban-types': 'off',
    // to use requires in tests
    '@typescript-eslint/no-var-requires': 'off',
    'prettier/prettier': ['error'],
    'no-empty-pattern': 'off',
  },
};
