import { default as ClosePlugin } from './vite-plugin-close.js'
import { UserConfig, UserConfigExport, defineConfig } from 'vite'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getAliases } from '../polkadot/index.js'
import { getLogger } from '@prosopo/common'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { default as viteReact } from '@vitejs/plugin-react'
import { wasm } from '@rollup/plugin-wasm'
import css from 'rollup-plugin-import-css'
import path from 'path'
const logger = getLogger(`Info`, `vite.config.js`)

export default function (bundleName: string, dir: string, entry: string): UserConfigExport {
    return defineConfig(async ({ command, mode }): Promise<UserConfig> => {
        logger.info(`Running at ${dir} in ${mode} mode`)

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
            'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
            'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
            'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT),
            // only needed if bundling with a site key
            'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
        }

        logger.info(`Env vars: ${JSON.stringify(define, null, 4)}`)

        // Get all dependencies of the current package
        const deps = await getDependencies(bundleName)

        // Get rid of any dependencies we don't want to bundle
        const { external, internal } = filterDependencies(deps, ['pm2', 'nodejs-polars', 'aws', 'webpack', 'vite'])

        // Add the node builtins (path, fs, os, etc.) to the external list
        const allExternal = [...builtinModules, ...builtinModules.map((m) => `node:${m}`), ...external]
        logger.info(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)
        const libraryName = 'procaptcha'
        const isProduction = mode === 'production'
        const alias = isProduction ? getAliases(dir) : []

        // Required to print RegExp in console (e.g. alias keys)
        RegExp.prototype['toJSON'] = RegExp.prototype.toString
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
            // resolve: {
            //     alias,
            // },

            build: {
                outDir: path.resolve(dir, 'dist/bundle'),
                minify: isProduction,
                ssr: false,
                lib: {
                    entry: path.resolve(dir, entry),
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
                    treeshake: 'smallest',
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
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                viteReact(),
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
}
