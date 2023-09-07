module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['plugin:workspaces/recommended', 'eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            "jsx": true
        }
    },
    plugins: ['workspaces', 'unused-imports', '@typescript-eslint', 'sort-imports-es6-autofix', 'prettier'],
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
        'prettier/prettier': ['error'],
    },
    ignorePatterns: [
        '**/artifacts/*',
        '**/dist/*',
        '**/*bundle*.js',
        '**/typechain/*',
    ],
}
