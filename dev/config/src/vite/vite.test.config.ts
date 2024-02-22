import { defineConfig } from 'vitest/config'
import VitePluginCloseAndCopy from './vite-plugin-close-and-copy.js'
import VitePluginSourcemapExclude from './vite-plugin-sourcemap-exclude.js'
import { PluginOption, Plugin } from 'vite'

export default function () {
    return defineConfig({
        build: {
            minify: false,
            sourcemap: false,
            rollupOptions: {
                maxParallelFileOps: 1,
                cache: false,
                output: {
                    sourcemap: false,
                },
            },
        },
        test: {
            watch: false,
            include: ['../../packages/*/src/**/*.test.ts', '../../contracts/*/src/**/*.test.ts'],
            watchExclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/demos/**',
                '../../packages/*/dist/**',
                '../../packages/datasets-fs/src/tests/data/**',
            ],
            logHeapUsage: true,
            coverage: {
                enabled: true,
            },
            useAtomics: true,
        },
        plugins: [VitePluginSourcemapExclude({ excludeNodeModules: true }), VitePluginCloseAndCopy() as Plugin],
    })
}
