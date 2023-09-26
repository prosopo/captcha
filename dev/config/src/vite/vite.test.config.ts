import { defineConfig } from 'vitest/config'
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
            include: ['../../packages/*/src/**/*.test.ts'],
            exclude: ['../../demos/**/*'], // '../!packages/**/*'],
            singleThread: true,
            watchExclude: ['**/node_modules/**', '**/dist/**'],
            testTimeout: 120000, // 2mins
            logHeapUsage: true,
            coverage: {
                enabled: true,
            },
        },
        plugins: [VitePluginSourcemapExclude({ excludeNodeModules: true })],
    })
}
