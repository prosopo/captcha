import pkgJson from './package.json' assert { type: 'json' };

export default {
    extends: './typedoc.base.config.js',
    entryPoints: pkgJson.workspaces,
    out: 'docs',
    entryPointStrategy: 'packages',
}