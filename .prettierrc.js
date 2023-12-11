export default {
    overrides: [
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
            rules: {

    trailingComma: 'es5',
    tabWidth: 4,
    semi: false,
    singleQuote: true,
    printWidth: 120,
            }
        },
    ],
}
