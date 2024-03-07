export default {
    includeVersion: true,
    darkHighlightTheme: 'material-theme-darker',
    lightHighlightTheme: 'material-theme-default',
    searchInComments: true,
    excludeExternals: true,
    commentStyle: 'all',
    skipErrorChecking: true, // skips errors from package dependency resolution. TODO remove this and get dependencies working
    // treatWarningsAsErrors: true, // TODO enable these when dependency resolution is fixed
    // treatValidationWarningsAsErrors: true, // TODO enable these when dependency resolution is fixed
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts', '**/src/tests/**/*'],
    cleanOutputDir: true,
    pretty: true,
    hideGenerator: true,
    navigationLinks: {
        Prosopo: 'https://prosopo.io',
    },
    sort: ['alphabetical'],
}
