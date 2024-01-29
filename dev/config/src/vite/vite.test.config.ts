import { defineConfig } from 'vitest/config'
import VitePluginCloseAndCopy from './vite-plugin-close-and-copy.js'
import VitePluginSourcemapExclude from './vite-plugin-sourcemap-exclude.js'

export default function () {
    console.log('************ vite config ************')
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
            // reporters: ['basic', 'hanging-process'], // https://github.com/vitest-dev/vitest/issues/4415
            include: ['../../packages/*/src/**/util.test.ts', '../../contracts/*/src/**/util.test.ts'],
            exclude: ['../../demos/**/*'], // '../!packages/**/*'],
            maxWorkers: 1,
            minWorkers: 1,
            environment: 'happy-dom',
            pool: 'threads',
            poolOptions: {
                forks: {
                    isolate: false,
                    singleFork: true,
                },
                threads: {
                    useAtomics: true,
                    minThreads: 1,
                    maxThreads: 1,
                    singleThread: true,
                }
            },
            // teardownTimeout: 100000,
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
            bail: 1
        },
        plugins: [],
    })
}
