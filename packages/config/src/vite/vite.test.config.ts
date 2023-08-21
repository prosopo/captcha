import { defineConfig } from 'vitest/config'
import SourceMapExclude from './vite-plugin-source-map-exclude.js'

export default function () {
    return defineConfig({
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
