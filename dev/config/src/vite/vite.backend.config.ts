// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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

    const define = {
        'process.env.WS_NO_BUFFER_UTIL': 'true',
        'process.env.WS_NO_UTF_8_VALIDATE': 'true',
        'process.env.PROSOPO_PACKAGE_VERSION': JSON.stringify(packageVersion),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode),
        ...(process.env.PROSOPO_DEFAULT_ENVIRONMENT && {
            'process.env.PROSOPO_DEFAULT_ENVIRONMENT': JSON.stringify(process.env.PROSOPO_DEFAULT_ENVIRONMENT),
        }),
        ...(process.env.PROSOPO_DEFAULT_NETWORK && {
            'process.env.PROSOPO_DEFAULT_NETWORK': JSON.stringify(process.env.PROSOPO_DEFAULT_NETWORK),
        }),
        ...(process.env.PROSOPO_SUBSTRATE_ENDPOINT && {
            'process.env.PROSOPO_SUBSTRATE_ENDPOINT': JSON.stringify(process.env.PROSOPO_SUBSTRATE_ENDPOINT),
        }),
        ...(process.env.PROSOPO_CONTRACT_ADDRESS && {
            'process.env.PROSOPO_CONTRACT_ADDRESS': JSON.stringify(process.env.PROSOPO_CONTRACT_ADDRESS),
        }),
    }

    logger.info(`Defined vars ${JSON.stringify(define, null, 2)}`)

    const entryAbsolute = path.resolve(packageDir, entry)

    // drop console logs if in production mode
    const drop: Drop[] | undefined = mode === 'production' ? ['console', 'debugger'] : undefined

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
                plugins: [css(), wasm(), nodeResolve()],
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
