module.exports = {
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:yaml/recommended',
        'plugin:json/recommended',
        'plugin:toml/standard',
        'plugin:regexp/recommended',
        'prettier', // must be last! disables rules which conflict with prettier
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
        'workspaces',
        'unused-imports',
        'sort-imports-es6-autofix',
        // do not add prettier to plugins otherwise rule conflicts will occur between prettier and eslint! run prettier as a separate command
    ],
    root: true,
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
        files: ["*.html"],
        parser: "@html-eslint/parser",
        extends: ["plugin:@html-eslint/recommended"],
        },
        {
            files: [
                '*.html',
                '*.ts',
                '*.tsx',
                '*.js',
                '*.jsx',
                '*.mjs',
                '*.cjs',
                '*.json',
                '*.yaml',
                '*.yml',
                '*.toml',
                '*.d.ts',
                '*.cts',
                '*.mts',
                '.*.json',
                '.*.js',
                '.*.mjs',
                '.*.cjs',
                '.*.yaml',
                '.*.yml',
                '.*.toml',
            ],
        },
    ],
}
