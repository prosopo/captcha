import pkgJson from './package.json' assert { type: 'json' }

const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -1).join('/')

export default {
    extends: './typedoc.base.config.js',
    entryPoints: pkgJson.workspaces,
    out: 'docs',
    entryPointStrategy: 'packages',
    name: 'Prosopo Captcha',
    basePath,
}
