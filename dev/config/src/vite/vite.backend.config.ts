import { AliasOptions, UserConfig } from 'vite'
import { default as ClosePlugin } from './vite-plugin-close-and-copy.js'
import { Drop } from 'esbuild'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { wasm } from '@rollup/plugin-wasm'
import VitePluginFixAbsoluteImports from './vite-plugin-fix-absolute-imports.js'
import css from 'rollup-plugin-import-css'
import nativePlugin from 'rollup-plugin-natives'
import path from 'path'
import replace from 'vite-plugin-filter-replace'

const logger = getLogger(`Info`, `vite.backend.config.js`)

const nodeJsPolarsDeps = [
    'nodejs-polars.android-arm64.node',
    'nodejs-polars.android-arm-eabi.node',
    'nodejs-polars.win32-x64-msvc.node',
    'nodejs-polars.win32-ia32-msvc.node',
    'nodejs-polars.win32-arm64-msvc.node',
    'nodejs-polars.darwin-x64.node',
    'nodejs-polars.darwin-arm64.node',
    'nodejs-polars.freebsd-x64.node',
    'nodejs-polars.linux-x64-musl.node',
    //'nodejs-polars.linux-x64-gnu.node', // - this is the only file that will be present
    'nodejs-polars.linux-arm64-musl.node',
    'nodejs-polars.linux-arm64-gnu.node',
    'nodejs-polars.linux-arm-gnueabihf.node',
]

const aliasOptions: AliasOptions = [
    // Replace the nodejs-polars dependency with the copied .node file to avoid complaints when bundling
    ...nodeJsPolarsDeps.map((dep) => ({
        find: `./${dep}`,
        replacement: 'nodejs-polars.linux-x64-gnu.node',
    })),
]

export default async function (
    packageName: string,
    packageVersion: string,
    bundleName: string,
    packageDir: string,
    entry: string,
    command?: string,
    mode?: string
): Promise<UserConfig> {
    const isProduction = mode === 'production'

    // Get all dependencies of the current package
    const { dependencies: deps, optionalPeerDependencies } = await getDependencies(packageName, true)

    // Assuming node_modules are at the root of the workspace
    const baseDir = path.resolve('../..')
    const nodeModulesDir = path.resolve(baseDir, 'node_modules')

    // Output directory is relative to directory of the package
    const outDir = path.resolve(packageDir, 'dist/bundle')

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, ['aws', 'webpack', 'vite', 'eslint'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...external,
        ...optionalPeerDependencies,
    ]

    console.log('allExternal', allExternal)

    logger.info(`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`)

    const nodeJsNodeFileToCopy = path.resolve(
        nodeModulesDir,
        './nodejs-polars-linux-x64-gnu/nodejs-polars.linux-x64-gnu.node'
    )
    logger.info(`.node files to copy ${nodeJsNodeFileToCopy}`)

    const define = {
        'process.env.WS_NO_BUFFER_UTIL': 'true',
        'process.env.WS_NO_UTF_8_VALIDATE': 'true',
        'process.env.PROSOPO_PACKAGE_VERSION': JSON.stringify(packageVersion),
    }

    logger.info(`Defined vars ${JSON.stringify(define, null, 2)}`)

    const entryAbsolute = path.resolve(packageDir, entry)

    const packageNameShort = packageName.replace('@prosopo/', '')

    const filterEntry = `^${baseDir}/packages/(?!${packageNameShort}/src/${entry.replace(
        './src/',
        ''
    )}$)(?!.*/node_modules/.*$).*$`

    // drop console logs if in production mode
    const drop: Drop[] | undefined = mode === 'production' ? ['console', 'debugger'] : undefined

    return {
        resolve: {
            alias: aliasOptions,
        },
        ssr: {
            noExternal: internal,
            external: allExternal,
        },
        optimizeDeps: {
            include: ['linked-dep', 'node_modules'],
            esbuildOptions: {
                loader: {
                    '.node': 'file',
                },
            },
        },
        esbuild: {
            platform: 'node',
            target: 'node16',
            drop,
            legalComments: 'none',
        },
        define,
        build: {
            outDir,
            minify: isProduction,
            ssr: true,
            target: 'node16',

            lib: {
                entry: entryAbsolute,
                name: bundleName,
                fileName: `${bundleName}.[name].bundle.js`,
                formats: ['es'],
            },
            modulePreload: { polyfill: false },
            commonjsOptions: {
                ignore: function (id) {
                    // Ignore Executable and Linkable Format (ELF) files from being interpreted as CommonJS. These are
                    // .node files that contain WebAssembly code. They are not CommonJS modules.
                    return id.indexOf('nodejs-polars-linux-x64-gnu') > -1
                },
            },
            rollupOptions: {
                treeshake: 'smallest',
                external: allExternal,
                watch: false,
                output: {
                    entryFileNames: `${bundleName}.[name].bundle.js`,
                },

                plugins: [
                    // This plugin copies .node files but doesn't work for nodejs-polars. Leaving it here in case it's
                    // useful in the future.
                    nativePlugin({
                        // Where we want to physically put the extracted .node files
                        copyTo: outDir,

                        // Path to the same folder, relative to the output bundle js
                        destDir: '.',

                        // Generate sourcemap
                        sourcemap: true,

                        // If the target is ESM, so we can't use `require` (and .node is not supported in `import` anyway), we will need to use `createRequire` instead.
                        targetEsm: true,
                    }),
                    css(),
                    wasm(),
                    nodeResolve(),
                ],
            },
        },
        plugins: [
            // plugin to replace stuff like import blah from string_encoder/lib/string_encoder.js with import blah from string_encoder
            VitePluginFixAbsoluteImports(),
            replace.default([
                // nodejs-polars is not being transformed by commonjsOptions (above) so we need to do a manual replace of
                // __dirname here
                {
                    filter: ['node_modules/nodejs-polars/bin/native-polars.js'],
                    replace: {
                        from: '__dirname',
                        to: "new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')",
                    },
                },
                // replace this import
                {
                    filter: ['node_modules/nodejs-polars/bin/native-polars.js'],
                    replace: {
                        from: '__dirname',
                        to: "new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')",
                    },
                },
                // replace any references to main process where we are not expecting it
                {
                    filter: new RegExp(filterEntry),
                    replace: {
                        from: 'esMain(import.meta)',
                        to: 'false',
                    },
                },
            ]),
            // We need the .node files to be available to the bundle
            viteStaticCopy({
                targets: [
                    {
                        src: nodeJsNodeFileToCopy,
                        dest: outDir,
                    },
                ],
            }),
            // plugin to close the bundle after build if not in serve mode
            command !== 'serve' ? ClosePlugin() : undefined,
        ],
    }
}
