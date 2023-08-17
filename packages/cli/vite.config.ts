import { ClosePlugin, filterDependencies, getDependencies } from '@prosopo/config'
import { UserConfig, defineConfig } from 'vite'
import { builtinModules } from 'module'
import { getLogger } from '@prosopo/common'
import { wasm } from '@rollup/plugin-wasm'
import css from 'rollup-plugin-import-css'
import nativePlugin from 'rollup-plugin-natives'
import nodeResolve from '@rollup/plugin-node-resolve'
import path from 'path'

const logger = getLogger(`Info`, `webpack.config.js`)

// function excludePolkadot() {
//     const excludeFiles = ['kusama.js', 'westend.js'] //'bytes.js'] //...interfacesToIgnore]
//     const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
//     logger.info(`startDir: ${startDir}`)
//     return getFilesInDirs(startDir, excludeFiles)
// }

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
    // Get all dependencies of the current package
    const deps = await getDependencies()

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, ['pm2', 'nodejs-polars', 'aws', 'webpack', 'vite'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [...builtinModules, ...builtinModules.map((m) => `node:${m}`), ...external]
    logger.info(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)
    // const alias = {}
    // // get a list of polkdaot files to exclude from the bundle
    // const externals = excludePolkadot()
    // // alias the files to mock.js
    // const mockFile = path.resolve(__dirname, '../config/dist/webpack/mock.js')
    // externals.forEach((file) => {
    //     logger.info(`resolving to mock.js: ${path.resolve(__dirname, 'mock.js')}`)
    //     alias[file] = mockFile
    // })
    return {
        ssr: {
            noExternal: internal,
            external: allExternal,
        },
        optimizeDeps: {
            include: ['linked-dep', 'node_modules'],
        },
        esbuild: {
            platform: 'node',
            target: 'node16',
        },
        define: {
            'process.env.WS_NO_BUFFER_UTIL': 'true',
            'process.env.WS_NO_UTF_8_VALIDATE': 'true',
        },
        build: {
            outDir: path.resolve(__dirname, 'dist/bundle'),
            minify: false,
            ssr: true,
            target: 'node16',
            lib: {
                entry: path.resolve(__dirname, './src/cli.ts'),
                name: 'provider_cli_bundle',
                fileName: 'provider_cli_bundle.main.bundle.js',
                formats: ['es'],
            },
            modulePreload: { polyfill: false },
            commonjsOptions: {
                exclude: ['mongodb/*'],
            },
            rollupOptions: {
                treeshake: 'smallest',
                external: allExternal,
                watch: false,
                plugins: [
                    nativePlugin({
                        // Where we want to physically put the extracted .node files
                        copyTo: 'dist/libs',

                        // Path to the same folder, relative to the output bundle js
                        destDir: './libs',

                        // Generate sourcemap
                        sourcemap: true,

                        // If the target is ESM, so we can't use `require` (and .node is not supported in `import` anyway), we will need to use `createRequire` instead.
                        targetEsm: true,
                    }),
                    css(),
                    wasm(),
                    nodeResolve({
                        browser: false,
                        preferBuiltins: false,
                        rootDir: path.resolve(__dirname, '../../'),
                    }),
                ],
            },
        },
        plugins: [ClosePlugin()],
    }
})
