import { ClosePluginOptions } from './vite-plugin-close-and-copy.js'
import { Drop } from 'esbuild'
import { UserConfig } from 'vite'
import { VitePluginCloseAndCopy } from './index.js'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getAliases } from '../polkadot/index.js'
import { getLogger } from '@prosopo/common'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import viteTsconfigPaths from 'vite-tsconfig-paths'

const logger = getLogger(`Info`, `vite.config.js`)

export default async function (
    packageName: string,
    bundleName: string,
    dir: string,
    entry: string,
    command?: string,
    mode?: string,
    copyOptions?: ClosePluginOptions,
    tsConfigPaths?: string[]
): Promise<UserConfig> {
    logger.info(`Running at ${dir} in ${mode} mode`)
    const isProduction = mode === 'production'
    // NODE_ENV must be wrapped in quotes. We just set it to the mode and ignore what's in the env file, otherwise the
    // mode and NODE_ENV can end up out of sync (one set to development and the other set to production, which causes
    // issues like this: https://github.com/hashicorp/next-mdx-remote/pull/323
    process.env.NODE_ENV = `${mode}`

    // logs NODE_ENV: ${process.env.NODE_ENV}
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`)

    // Set the env vars that we want to be available in the browser
    const define = {
        // used to stop websockets package from breaking
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.PROSOPO_SUBSTRATE_ENDPOINT': JSON.stringify(process.env.PROSOPO_SUBSTRATE_ENDPOINT),
        'process.env.PROSOPO_DEFAULT_ENVIRONMENT': JSON.stringify(process.env.PROSOPO_DEFAULT_ENVIRONMENT),
        'process.env.PROSOPO_DEFAULT_NETWORK': JSON.stringify(process.env.PROSOPO_DEFAULT_NETWORK),
        'process.env.PROSOPO_SERVER_URL': JSON.stringify(process.env.PROSOPO_SERVER_URL),
        'process.env._DEV_ONLY_WATCH_EVENTS': JSON.stringify(process.env._DEV_ONLY_WATCH_EVENTS),
        'process.env.PROSOPO_CONTRACT_ADDRESS': JSON.stringify(process.env.PROSOPO_CONTRACT_ADDRESS),
        // only needed if bundling with a site key
        'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
    }

    logger.info(`Env vars: ${JSON.stringify(define, null, 4)}`)

    // Get all dependencies of the current package
    const { dependencies: deps } = await getDependencies(packageName, isProduction)

    // Get rid of any dependencies we don't want to bundle
    const { internal } = filterDependencies(deps, ['pm2', 'nodejs-polars', 'aws', 'webpack', 'vite'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    logger.debug(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)

    //sets the alias with getaliases
    const alias = getAliases(dir)

    // Required to print RegExp in console (e.g. alias keys)
    const proto = RegExp.prototype as any
    proto['toJSON'] = RegExp.prototype.toString
    logger.debug(`aliases ${JSON.stringify(alias, null, 2)}`)

    // drop console logs if in production mode
    let drop: undefined | Drop[]
    // defines pure
    let pure: string[] | undefined
    if (isProduction) {
        drop = ['debugger']
        pure = ['console.log', 'console.warn']
    }

    logger.info('Bundle name', bundleName)
    return {
        server: {
            // sets host to 12
            host: '127.0.0.1',
        },
        mode: mode || 'development',
        esbuild: {
            platform: 'browser',
            target: ['es2020', 'chrome60', 'edge18', 'firefox60', 'node12', 'safari11'],
            drop,
            pure,
            legalComments: 'none',
        },
        define,
        resolve: {
            alias,
        },
        build: {
            outDir: path.resolve(dir, 'dist/bundle'),
            minify: isProduction,
            lib: {
                entry: path.resolve(dir, entry),
                name: bundleName,
                fileName: `${bundleName}.bundle.js`,
                formats: ['es'],
            },
            commonjsOptions: {
                exclude: ['mongodb/*'],
                transformMixedEsModules: true,
                strictRequires: 'debug',
            },
            rollupOptions: {
                output: {
                    dir: path.resolve(dir, 'dist/bundle'),
                    entryFileNames: `${bundleName}.bundle.js`,
                },
                plugins: [
                    visualizer({
                        open: true,
                        template: 'treemap',
                        gzipSize: true,
                        brotliSize: true,
                    }),
                ],
            },
        },
        plugins: [
            command !== 'serve' ? VitePluginCloseAndCopy(copyOptions) : undefined,
            // Means we can specify index.tsx instead of index.jsx in the index.html file
            viteTsconfigPaths({ projects: tsConfigPaths }),
        ],
    }
}
