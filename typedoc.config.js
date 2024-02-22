import pkgJson from './package.json' assert { type: 'json' }

export default {
    out: 'docs',
    entryPoints: pkgJson.workspaces,
    entryPointStrategy: 'packages',
    includeVersion: true,
    darkHighlightTheme: 'dark-plus',
    searchInComments: true,
    commentStyle: 'all',
    treatWarningsAsErrors: true,
    treatValidationWarningsAsErrors: true,
}