import { AliasOptions, UserConfig } from 'vite'
import { default as ClosePlugin } from './vite-plugin-close-and-copy.js'
import { Drop } from 'esbuild'
import { Plugin } from 'vite'
import { PluginBuild } from 'esbuild'
import { builtinModules } from 'module'
import { filterDependencies, getDependencies } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { wasm } from '@rollup/plugin-wasm'
import VitePluginFixAbsoluteImports from './vite-plugin-fix-absolute-imports.js'
import css from 'rollup-plugin-import-css'
import fs from 'fs/promises'
import nativePlugin from 'rollup-plugin-natives'
import path from 'path'

type ReplaceFn = (source: string, path: string) => string
type ReplacePair = { from: RegExp | string | string[]; to: string | number }

interface Replacement {
    /**
     * for debugging purpose
     */
    id?: string | number
    filter: RegExp | string | string[]
    replace: ReplacePair | ReplaceFn | Array<ReplacePair | ReplaceFn>
}

type Options = Pick<Plugin, 'enforce' | 'apply'>

function escape(str: string): string {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

function parseReplacements(
    replacements: Replacement[]
): Array<Omit<Replacement, 'replace' | 'filter'> & { filter: RegExp; replace: ReplaceFn[] }> {
    if (!replacements || !replacements.length) return []

    // TODO:
    // re-group replacements to ensure filter is unique

    return replacements.reduce((entries: any[], replacement) => {
        const filter =
            replacement.filter instanceof RegExp
                ? replacement.filter
                : new RegExp(
                      `(${[]
                          .concat(replacement.filter as any)
                          .filter((i) => i)
                          .map((i: string) => escape(i.trim().replace(/\\+/g, '/')))
                          .join('|')})`
                  )
        let { replace = [] } = replacement

        if (!filter) return entries
        if (typeof replace === 'function' || !Array.isArray(replace)) {
            replace = [replace]
        }

        replace = replace.reduce((entries: ReplaceFn[], rp) => {
            if (typeof rp === 'function') return entries.concat(rp)

            const { from, to } = rp

            if (from === undefined || to === undefined) return entries

            return entries.concat((source) =>
                source.replace(
                    from instanceof RegExp
                        ? from
                        : new RegExp(
                              `(${[]
                                  .concat(from as any)
                                  .map(escape)
                                  .join('|')})`,
                              'g'
                          ),
                    String(to)
                )
            )
        }, [])

        if (!replace.length) return entries

        return entries.concat({ ...replacement, filter, replace })
    }, [])
}

export function replace(replacements: Replacement[] = [], options?: Options): Plugin {
    const resolvedReplacements = parseReplacements(replacements)
    let isServe = true

    if (!resolvedReplacements.length) return {} as any

    function replace(code: string, id: string): string {
        return resolvedReplacements.reduce((code, rp) => {
            if (!rp.filter.test(id)) {
                return code
            }
            return rp.replace.reduce((text, replace) => replace(text, id), code)
        }, code)
    }

    return {
        name: 'vite-plugin-filter-replace',
        enforce: options?.enforce,
        apply: options?.apply,
        config: (config: any, env: any) => {
            isServe = env.command === 'serve'

            if (!isServe) return

            if (!config.optimizeDeps) {
                config.optimizeDeps = {}
            }
            if (!config.optimizeDeps.esbuildOptions) {
                config.optimizeDeps.esbuildOptions = {}
            }
            if (!config.optimizeDeps.esbuildOptions.plugins) {
                config.optimizeDeps.esbuildOptions.plugins = []
            }

            config.optimizeDeps.esbuildOptions.plugins.unshift(
                ...resolvedReplacements.map((option) => {
                    return {
                        name: 'vite-plugin-filter-replace' + (option.id ? `:${option.id}` : ''),
                        setup(build: PluginBuild) {
                            build.onLoad({ filter: option.filter, namespace: 'file' }, async ({ path }) => {
                                const source = await fs.readFile(path, 'utf8')

                                return {
                                    loader: 'default',
                                    contents: option.replace.reduce((text, replace) => replace(text, path), source),
                                }
                            })
                        },
                    }
                })
            )

            return config
        },
        renderChunk(code: any, chunk: any) {
            if (isServe) return null
            return replace(code, chunk.fileName)
        },
        transform(code: any, id: any) {
            return replace(code, id)
        },
        async handleHotUpdate(ctx: any) {
            const defaultRead = ctx.read
            ctx.read = async function () {
                return replace(await defaultRead(), ctx.file)
            }
        },
    }
}

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
                ignore: function (id: any) {
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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            replace([
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
                        from: 'isMain(import.meta)',
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
