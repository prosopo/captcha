export default {
    includeVersion: true,
    plugin: ["typedoc-material-theme", "typedoc-plugin-missing-exports", "typedoc-plugin-mdn-links", "typedoc-plugin-zod"],
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
