import { defineConfig } from 'vitest/config'
import { getRootDir } from '../projectInfo.js'
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
            root: getRootDir(),
            include: ['packages/*/src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
            watch: false,
            watchExclude: ['**/node_modules/**', '**/dist/**'],
            logHeapUsage: true,
            coverage: {
                enabled: true,
                include: ['packages/*/src/**'],
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
