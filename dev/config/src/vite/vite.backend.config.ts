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
import fs from 'fs'
import nativePlugin from 'vite-plugin-native'
import path from 'path'
import sub from '@rollup/plugin-replace'
import replace from 'vite-plugin-filter-replace'
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger(`Info`, `vite.backend.config.js`)


// https://stackoverflow.com/questions/66378682/nodejs-loading-es-modules-and-native-addons-in-the-same-project

/**
 * 
import { createRequire } from 'module'; 
const customRequire = createRequire(import.meta.url)
console.log('addon', customRequire('./ghi/abc.js'))
console.log('addon', customRequire('./nodejs-polars.linux-x64-gnu.node'))
console.log('addon', customRequire('./nodejs-polars.linux-x64-gnu.node').version())
// console.log('nativePolars', (await import(nativePolars.default)).version())
 */

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

const snakeCaseToCamelCase = (str: string) => {
    return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
}

export default async function (
    packageName: string,
    packageVersion: string,
    bundleName: string,
    packageDir: string,
    entry: string,
    command?: string,
    mode?: string,
    optionalBaseDir = '../..'
): Promise<UserConfig> {
    const isProduction = mode === 'production'

    // Get all dependencies of the current package
    const { dependencies: deps, optionalPeerDependencies } = await getDependencies(packageName, true)

    // Assuming node_modules are at the root of the workspace
    const baseDir = path.resolve(optionalBaseDir)
    const nodeModulesDir = path.resolve(baseDir, 'node_modules')

    // Output directory is relative to directory of the package
    const outDir = path.resolve(packageDir, 'dist/bundle')
    fs.mkdirSync(outDir, { recursive: true })

    // Get rid of any dependencies we don't want to bundle
    const { external, internal } = filterDependencies(deps, ['aws', 'webpack', 'vite', 'eslint'])

    // Add the node builtins (path, fs, os, etc.) to the external list
    const allExternal = [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...external,
        ...optionalPeerDependencies,
    ]

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
        ...(process.env.PROSOPO_DEFAULT_ENVIRONMENT && {
            'process.env.PROSOPO_DEFAULT_ENVIRONMENT': JSON.stringify(process.env.PROSOPO_DEFAULT_ENVIRONMENT),
        }),
        ...(process.env.PROSOPO_DEFAULT_NETWORK && {
            'process.env.PROSOPO_DEFAULT_NETWORK': JSON.stringify(process.env.PROSOPO_DEFAULT_NETWORK),
        }),
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

    const dirnamePlugin = () => {
        return {
            name: 'dirname-plugin',
            resolveId(source: string, importer: string | undefined, options: any) {
                // aim for the node_modules/nodejs-polars/bin/native-polars.js file
                if (source.endsWith('nodejs-polars/bin/native-polars.js')) {
                    console.log('****', 'resolve dirname', source)
                    return source
                }
                return null
            },
            transform(code: string, id: string) {
                // aim for the node_modules/nodejs-polars/bin/native-polars.js file
                if (id.endsWith('nodejs-polars/bin/native-polars.js')) {
                    console.log('****', 'transform dirname', id)
                    const newCode = code.replaceAll(`__dirname`, `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`)
                    return newCode
                }
                return code
            },
        }
    }

    const customPlugin = () => {
        return {
            name: 'custom-plugin',
            resolveId(source: string, importer: string | undefined, options: any) {
                // return the id if this plugin can resolve the import
                if (source.endsWith('nodejs-polars.linux-x64-gnu.node')) {
                    console.log('****', 'handle import of polars', source, 'from', importer)
                    return source
                }
                if (source.includes('my-super-special-module')) {
                    console.log('****', 'resolve custom module', source)
                    return source
                }
                return null // otherwise return null indicating that this plugin can't handle the import
            },
            transform(code: string, id: string) {
                if (id.endsWith('.node')) {
                    console.log('****', 'transform node', id)
                    // console.log('****', 'code', code)
                    const newCode = code.replace(id, `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/') + "/nodejs-polars.linux-x64-gnu.node"`)
                    // console.log('****', 'new code', newCode)
                    return `
                    // create a custom require function to load .node files
                    import { createRequire } from 'module';
                    const customRequire = createRequire(import.meta.url)

                    // load the .node file expecting it to be in the same directory as the output bundle
                    const content = customRequire('./nodejs-polars.linux-x64-gnu.node')

                    // export the content straight back out again
                    export default content
                    `
                }
                return code
            },
            load(id: string) {
                if (id.includes('my-super-special-module')) {
                    console.log('****', 'load custom module', id)
                    return ''
                }
                if (id.endsWith('.node')) {
                    console.log('****', 'load node', id)
                }
                if (id === './nodejs-polars.linux-x64-gnu.node' || id === 'nodejs-polars.linux-x64-gnu.node') {
                    console.log('****', 'load', id)
                    // replace code with new code which imports the .node file
                    const newCode = `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/') + "/nodejs-polars.linux-x64-gnu.node"`
                    return newCode
                }
                return null
            },
            generateBundle(options: any, bundleObj: any) {
                // copy the .node file to the output directory
                const out = outDir + '/nodejs-polars.linux-x64-gnu.node'
                const target = nodeModulesDir + '/nodejs-polars-linux-x64-gnu/nodejs-polars.linux-x64-gnu.node'
                console.log('****', 'copying', target, 'to', out)
                const nodeFile = fs.readFileSync(target)
                fs.writeFileSync(out, nodeFile)
            }
        }
    }

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
            target: 'node18',
            drop,
            legalComments: 'none',
        },
        define,
        build: {
            outDir,
            minify: false,
            ssr: true,
            target: 'node18',

            lib: {
                entry: entryAbsolute,
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
                    css(), wasm(), nodeResolve(), dirnamePlugin(), customPlugin()],
            },
        },
        plugins: [
            // plugin to replace stuff like import blah from string_encoder/lib/string_encoder.js with import blah from string_encoder
            VitePluginFixAbsoluteImports(),
            // plugin to close the bundle after build if not in serve mode
            command !== 'serve' ? ClosePlugin() : undefined,
        ],
    }
}
