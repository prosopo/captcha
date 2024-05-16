// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
            //root: getRootDir(),
            reporters: ['basic'],
            include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
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
