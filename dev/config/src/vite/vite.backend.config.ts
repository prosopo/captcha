import { default as ClosePlugin } from './vite-plugin-close-and-copy.js'
import { Drop } from 'esbuild'
import { UserConfig } from 'vite'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { wasm } from '@rollup/plugin-wasm'
import VitePluginFixAbsoluteImports from './vite-plugin-fix-absolute-imports.js'
import css from 'rollup-plugin-import-css'
import fs from 'fs'
import path from 'path'

const logger = getLogger(`Info`, `vite.backend.config.js`)

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

    // drop console logs if in production mode
    const drop: Drop[] | undefined = mode === 'production' ? ['console', 'debugger'] : undefined

    const nodejsPolarsDirnamePlugin = () => {
        const name = 'nodejs-polars-dirname-plugin'
        return {
            name,
            resolveId(source: string, importer: string | undefined, options: any) {
                // aim for the node_modules/nodejs-polars/bin/native-polars.js file
                if (source.endsWith('nodejs-polars/bin/native-polars.js')) {
                    logger.debug(name, 'resolves', source, 'imported by', importer)
                    // return the source to indicate this plugin can resolve the import
                    return source
                }
                // return null if this plugin can't resolve the import
                return null
            },
            transform(code: string, id: string) {
                // aim for the node_modules/nodejs-polars/bin/native-polars.js file
                if (id.endsWith('nodejs-polars/bin/native-polars.js')) {
                    // replace all instances of __dirname with the path relative to the output bundle
                    logger.debug(name, 'transform', id)
                    const newCode = code.replaceAll(
                        `__dirname`,
                        `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`
                    )
                    return newCode
                }
                // else return the original code (leave code unrelated to nodejs-polars untouched)
                return code
            },
        }
    }

    const nodejsPolarsNativeFilePlugin = () => {
        const name = 'nodejs-polars-native-file-plugin'
        // a list of the node files to be handled. Starts from root dir
        const nodeFiles = [nodeJsNodeFileToCopy]
        return {
            name,
            resolveId(source: string, importer: string | undefined, options: any) {
                // return the id if this plugin can resolve the import
                for (const file of nodeFiles) {
                    if (path.basename(source) === path.basename(file)) {
                        logger.debug(name, 'resolves', source, 'imported by', importer)
                        return source
                    }
                }
                return null // otherwise return null indicating that this plugin can't handle the import
            },
            transform(code: string, id: string) {
                for (const file of nodeFiles) {
                    // rewrite the code to import the .node file
                    if (path.basename(id) === path.basename(file)) {
                        logger.debug(name, 'transform', id)
                        // https://stackoverflow.com/questions/66378682/nodejs-loading-es-modules-and-native-addons-in-the-same-project
                        // this makes the .node file load at runtime from an esm context. .node files aren't native to esm, so we have to create a custom require function to load them. The custom require function is equivalent to the require function in commonjs, thus allowing the .node file to be loaded.
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
                }
                return code
            },
            load(id: string) {
                for (const file of nodeFiles) {
                    if (path.basename(id) === path.basename(file)) {
                        logger.debug(name, 'load', id)
                        // whenever we encounter an import of the .node file, we return an empty string. This makes it look like the .node file is empty to the bundler. This is because we're going to copy the .node file to the output directory ourselves, so we don't want the bundler to include it in the output bundle (also because the bundler can't handle .node files, it tries to read them as js and then complains that it's invalid js)
                        const newCode = ``
                        return newCode
                    }
                }
                return null
            },
            generateBundle(_: any, bundle: any) {
                console.log('BUILD END')
                for (const fileAbs of nodeFiles) {
                    const file = path.basename(fileAbs)
                    // copy the .node file to the output directory
                    const out = `${outDir}/${file}`
                    const src = `${fileAbs}`
                    logger.debug(name, 'copy', src, 'to', out)
                    console.log(name, 'copy', src, 'to', out)
                    const nodeFile = fs.readFileSync(src)
                    // create the parent dir of the out file
                    fs.mkdirSync(path.dirname(out), { recursive: true })
                    fs.writeFileSync(out, nodeFile)
                }
                fs.writeFileSync(`${outDir}/hello`, 'abc')
            },
        }
    }

    return {
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
            minify: isProduction,
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

                plugins: [css(), wasm(), nodeResolve(), nodejsPolarsDirnamePlugin(), nodejsPolarsNativeFilePlugin()],
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
