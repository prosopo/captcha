import { defineConfig } from 'vitest/config'
import VitePluginCloseAndCopy from './vite-plugin-close-and-copy.js'
import VitePluginSourcemapExclude from './vite-plugin-sourcemap-exclude.js'

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
            watchExclude: [
                '**/node_modules/**',
                '**/dist/**',
                '../../packages/datasets-fs/src/tests/data/**',
            ],
            logHeapUsage: true,
            coverage: {
                enabled: true,
            },
            typecheck: {
                enabled: true,
            },
            pool: 'forks', // forks is slower than 'threads' but more compatible with low-level libs (e.g. bcrypt)
            testTimeout: 10000,
        },
        plugins: [VitePluginSourcemapExclude({ excludeNodeModules: true }), VitePluginCloseAndCopy()],
    })
}
