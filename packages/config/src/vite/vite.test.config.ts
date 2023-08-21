import { defineConfig } from 'vitest/config'
import SourceMapExclude from './vite-plugin-source-map-exclude.js'

export default function () {
    return defineConfig({
        build: {
            minify: false,
            sourcemap: false,
            rollupOptions: {
                maxParallelFileOps: 2,
                cache: false,
                output: {
                    sourcemap: false,
                },
            },
        },
        test: {
            include: ['../packages/*/tests/**/*.test.ts'],
            exclude: ['../demos/**/*'], // '../!packages/**/*'],
            minThreads: 4,
            maxThreads: 4,
            watchExclude: ['**/node_modules/**', '**/dist/**'],
        },
        plugins: [SourceMapExclude({ excludeNodeModules: true })],
    })
}
