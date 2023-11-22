import { UserConfig, defineConfig } from 'vite'
import { builtinModules } from 'module'
import { getExternalsFromReferences } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import { default as noBundlePlugin } from 'vite-plugin-no-bundle'
import VitePluginCloseAndCopy from './vite-plugin-close-and-copy.js'
import path from 'path'
import replace from '@rollup/plugin-replace'
import tsconfigPaths from 'vite-tsconfig-paths'

const log = getLogger(`Info`, `vite.commonjs.config.ts`)

export default async function (name: string, tsConfigPath: string, entry?: string): Promise<UserConfig> {
    log.info(`ViteCommonJSConfig: ${name}`)
    const projectExternal = await getExternalsFromReferences(tsConfigPath, [/dev/])
    const allExternal = [...builtinModules, ...builtinModules.map((m) => `node:${m}`), ...projectExternal]
    return defineConfig({
        ssr: { external: allExternal },
        plugins: [
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            replace({
                'esMain(import.meta)': 'require.main === module', // Replaces esMain checks with CommonJS equivalent
            }),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            noBundlePlugin({
                root: 'src',
                copy: '**/*.css',
            }),
            tsconfigPaths({ projects: [path.resolve('./tsconfig.cjs.json')] }),
            VitePluginCloseAndCopy(),
        ],
        build: {
            emptyOutDir: true,
            ssr: true,
            target: 'node16',
            outDir: 'dist/cjs',
            lib: {
                name,
                formats: ['cjs'],
                entry: entry || 'src/index.ts', // required
            },
            rollupOptions: {
                treeshake: false,
                external: allExternal,
            },
        },
    })
}
