export default {
    entryPoints: ['cypress/**/*.ts', 'cypress/**/*.tsx', 'cypress/**/*.js', 'cypress/**/*.jsx', 'cypress/**/*.json'],
    includes: 'cypress',
    extends: '../../typedoc.base.config.js',
    readme: 'README.md',
}
