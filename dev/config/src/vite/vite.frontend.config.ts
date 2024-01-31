import { ClosePluginOptions } from './vite-plugin-close-and-copy.js'
import { Drop } from 'esbuild'
import { UserConfig } from 'vite'
import { VitePluginCloseAndCopy } from './index.js'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getAliases } from '../polkadot/index.js'
import { getLogger } from '@prosopo/common'
import { visualizer } from 'rollup-plugin-visualizer'
import { default as viteReact } from '@vitejs/plugin-react'
import { wasm } from '@rollup/plugin-wasm'
import css from 'rollup-plugin-import-css'
import nodeResolve from '@rollup/plugin-node-resolve'
import path from 'path'
import typescript from '@rollup/plugin-typescript'
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
    const { dependencies: deps, optionalPeerDependencies } = await getDependencies(packageName, isProduction)

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, ['pm2', 'nodejs-polars', 'aws', 'webpack', 'vite'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...external,
        ...optionalPeerDependencies,
    ]
    logger.debug(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)
    const alias = getAliases(dir)

    // Required to print RegExp in console (e.g. alias keys)
    const proto = RegExp.prototype as any
    proto['toJSON'] = RegExp.prototype.toString
    logger.debug(`aliases ${JSON.stringify(alias, null, 2)}`)

    // drop console logs if in production mode
    const drop: Drop[] | undefined = mode === 'production' ? ['console', 'debugger'] : undefined

    logger.info('Bundle name', bundleName)
    return {
        ssr: {
            target: 'webworker',
        },
        server: {
            host: '127.0.0.1',
        },
        mode: mode || 'development',
        optimizeDeps: {
            include: ['linked-dep', 'esm-dep > cjs-dep', 'node_modules'],
            force: true,
        },
        esbuild: {
            platform: 'browser',
            target: ['es2020', 'chrome60', 'edge18', 'firefox60', 'node12', 'safari11'],
            drop,
            legalComments: 'none',
        },
        define,
        resolve: {
            alias,
        },

        build: {
            outDir: path.resolve(dir, 'dist/bundle'),
            minify: isProduction,
            ssr: false,
            lib: {
                entry: path.resolve(dir, entry),
                name: bundleName,
                fileName: `${bundleName}.bundle.js`,
                formats: ['es'],
            },
            modulePreload: { polyfill: true },
            commonjsOptions: {
                exclude: ['mongodb/*'],
                transformMixedEsModules: true,
                strictRequires: 'debug',
            },

            rollupOptions: {
                treeshake: {
                    annotations: false,
                    propertyReadSideEffects: false,
                    tryCatchDeoptimization: false,
                    moduleSideEffects: 'no-external', //true,
                    preset: 'smallest',
                    manualPureFunctions: ['createWasmFn', 'unzlibSync', 'withWasm', 'isReady', 'initBridge', 'twox'],
                    unknownGlobalSideEffects: false,
                },
                experimentalLogSideEffects: false,
                external: allExternal,
                watch: false,

                output: {
                    dir: path.resolve(dir, 'dist/bundle'),
                    entryFileNames: `${bundleName}.bundle.js`,
                },

                plugins: [
                    css(),
                    wasm(),
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    nodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        rootDir: path.resolve(dir, '../../'),
                        dedupe: ['react', 'react-dom'],
                        modulesOnly: true,
                    }),
                    visualizer({
                        open: true,
                        template: 'treemap', //'list',
                        gzipSize: true,
                        brotliSize: true,
                    }),
                    // I think we can use this plugin to build all packages instead of relying on the tsc step that's
                    // currently a precursor in package.json. However, it fails for the following reason:
                    // https://github.com/rollup/plugins/issues/243
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    typescript({
                        tsconfig: path.resolve('./tsconfig.json'),
                        compilerOptions: { rootDir: path.resolve('./src') },
                        outDir: path.resolve(dir, 'dist/bundle'),
                    }),
                ],
            },
        },
        plugins: [
            // Not sure if we need this plugin or not, it works without it
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            viteReact(),
            // Closes the bundler and copies the bundle to the client-bundle-example project unless we're in serve
            // mode, in which case we don't want to close the bundler because it will close the server
            command !== 'serve' ? VitePluginCloseAndCopy(copyOptions) : undefined,
            // Means we can specify index.tsx instead of index.jsx in the index.html file
            viteTsconfigPaths({ projects: tsConfigPaths }),
        ],
    }
}
