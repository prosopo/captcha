import { defineConfig } from 'vitest/config'
import SourceMapExclude from './vite-plugin-source-map-exclude.js'

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
        plugins: [SourceMapExclude({ excludeNodeModules: true })],
    })
}
