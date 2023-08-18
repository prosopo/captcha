import { AliasOptions, UserConfig, defineConfig } from 'vite'
import { ClosePlugin, filterDependencies, getDependencies } from '@prosopo/config'
import { builtinModules } from 'module'
import { getLogger } from '@prosopo/common'
import { loadEnv } from '@prosopo/util'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { wasm } from '@rollup/plugin-wasm'
import css from 'rollup-plugin-import-css'
import excludePolkadot from '@prosopo/config/dist/polkadot/exclude'
import nodeResolve from '@rollup/plugin-node-resolve'
import path from 'path'
const logger = getLogger(`Info`, `vite.config.js`)

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
    const dir = path.resolve()
    logger.info(`Running at ${dir} in ${mode} mode`)

    // load env using our util because vite loadEnv is not working for .env.development
    loadEnv()

    // NODE_ENV must be wrapped in quotes. We just set it to the mode and ignore what's in the env file, otherwise the
    // mode and NODE_ENV can end up out of sync (one set to development and the other set to production, which causes
    // issues like this: https://github.com/hashicorp/next-mdx-remote/pull/323
    process.env.NODE_ENV = `"${mode}"`

    // Set the env vars that we want to be available in the browser
    const define = {
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
        'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
        'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT),
        //only needed if bundling with a site key
        'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
    }

    logger.info(`Env vars: ${JSON.stringify(define, null, 4)}`)

    // Get all dependencies of the current package
    const deps = await getDependencies('procaptcha-bundle')

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, ['pm2', 'nodejs-polars', 'aws', 'webpack', 'vite'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [...builtinModules, ...builtinModules.map((m) => `node:${m}`), ...external]
    logger.info(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)
    const libraryName = 'procaptcha'
    const isProduction = mode === 'production'
    const polkadotFilesToAlias = excludePolkadot()
    const alias: AliasOptions = {}
    const mockFile = path.resolve(dir, '../config/dist/polkadot/mock.js')
    polkadotFilesToAlias.forEach((file) => {
        logger.info(`resolving ${file} to mock.js`)
        alias[file] = mockFile
    })
    alias['react'] = path.resolve(dir, '../../node_modules/react')
    logger.info(`aliases ${JSON.stringify(alias, null, 2)}`)
    return {
        mode: mode || 'development',
        optimizeDeps: {
            include: ['linked-dep', 'esm-dep > cjs-dep', 'node_modules'], //'node_modules'
            //exclude: ['react', 'react-dom'],
        },
        esbuild: {
            platform: 'browser',
            target: ['es2020', 'chrome58', 'edge16', 'firefox57', 'node12', 'safari11'],
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
                entry: path.resolve(dir, './src/index.tsx'),
                name: libraryName,
                fileName: `${libraryName}.[name].bundle`,
                // sets the bundle to an instantly invoked function expression (IIFE)
                formats: ['iife'],
            },
            modulePreload: { polyfill: true },
            commonjsOptions: {
                exclude: ['mongodb/*'],
                transformMixedEsModules: true,
            },

            rollupOptions: {
                //treeshake: 'smallest',
                external: allExternal,
                watch: false,
                output: {
                    dir: path.resolve(dir, 'dist/bundle'),
                },

                plugins: [
                    css(),
                    wasm(),
                    nodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        rootDir: path.resolve(dir, '../../'),
                        dedupe: ['react', 'react-dom'],
                    }),
                    // I think we can use this plugin to build all packages instead of relying on the tsc step that's
                    // currently a precursor in package.json. However, it fails for the following reason:
                    // https://github.com/rollup/plugins/issues/243
                    // typescript({
                    //     tsconfig: path.resolve('./tsconfig.json'),
                    //     compilerOptions: { rootDir: path.resolve('./src') },
                    // }),
                ],
            },
        },
        plugins: [
            // Not sure if we need this plugin or not, it works without it
            //react(),
            viteCommonjs(),
            // Closes the bundler and copies the bundle to the client-bundle-example project
            ClosePlugin({
                srcDir: './dist/bundle',
                destDir: '../../demos/client-bundle-example/src',
                bundleName: libraryName,
            }),
        ],
    }
})
