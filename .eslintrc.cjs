module.exports = {
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    extends: [
        'plugin:yaml/recommended',
        'plugin:json/recommended',
        'plugin:toml/standard',
        'eslint:recommended',
        'plugin:regexp/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: [
        'workspaces',
        '@html-eslint',
        'unused-imports',
        '@typescript-eslint',
        'sort-imports-es6-autofix',
    ],
    rules: {
        'no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
            },
        ],
        //"indent": ["error", 4],
        //"indent": "off",
        'sort-imports': [
            'error',
            {
                ignoreDeclarationSort: true,
                allowSeparatedGroups: false,
            },
        ],
        'sort-imports-es6-autofix/sort-imports-es6': [
            2,
            {
                ignoreCase: false,
                ignoreMemberSort: false,
                memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            },
        ],
        'json/*': ['error', { allowComments: true }],
    },
    overrides: [
        {
            files: ['*.html'],
            parser: '@html-eslint/parser',
            extends: ['plugin:@html-eslint/recommended'],
        },
    ],
}
