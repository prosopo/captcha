
export default {
    extends: './typedoc.base.config.js',
    // entryPoints: pkgJson.workspaces,
    entryPoints: ['packages/util', 'packages/server'],
    out: 'docs',
    entryPointStrategy: 'packages',
}