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
            include: ['../../packages/*/tests/**/*.test.ts'],
            exclude: ['../../demos/**/*'], // '../!packages/**/*'],
            minThreads: 1,
            maxThreads: 1,
            watchExclude: ['**/node_modules/**', '**/dist/**'],
        },
        plugins: [VitePluginSourcemapExclude({ excludeNodeModules: true })],
    })
}
