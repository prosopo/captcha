import { default as ClosePlugin } from './vite-plugin-close.js'
import { UserConfig } from 'vite'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import { wasm } from '@rollup/plugin-wasm'
import css from 'rollup-plugin-import-css'
import nativePlugin from 'rollup-plugin-natives'
import path from 'path'

const logger = getLogger(`Info`, `vite.backend.config.js`)

export default async function (
    packageName: string,
    bundleName: string,
    dir: string,
    entry: string,
    command?: string,
    mode?: string
): Promise<UserConfig> {
    // Get all dependencies of the current package
    const { dependencies: deps, optionalPeerDependencies } = await getDependencies(packageName)

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, [
        'pm2',
        'nodejs-polars',
        'aws',
        'webpack',
        'vite',
        'eslint',
    ])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...external,
        ...optionalPeerDependencies,
    ]

    console.log('allExternal', allExternal)

    logger.info(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)

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
            outDir: path.resolve(dir, 'dist/bundle'),
            minify: false,
            ssr: true,
            target: 'node16',

            lib: {
                entry: path.resolve(dir, entry),
                name: bundleName,
                fileName: `${bundleName}.[name].bundle.js`,
                formats: ['es'],
            },
            modulePreload: { polyfill: false },
            rollupOptions: {
                treeshake: 'smallest',
                external: allExternal,
                watch: false,
                output: {
                    entryFileNames: `${bundleName}.[name].bundle.js`,
                },

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
                ],
            },
        },
        plugins: [command !== 'serve' ? ClosePlugin() : undefined],
    }
}
