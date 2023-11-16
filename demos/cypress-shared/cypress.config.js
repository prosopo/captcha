// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { builtinModules } from 'module'
import { defineConfig } from 'cypress'
import builtIns from 'rollup-plugin-node-builtins'
import nodeResolve from '@rollup/plugin-node-resolve'
import vitePreprocessor from 'cypress-vite'
const external = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]
export default defineConfig({
    headers: { 'Accept-Encoding': 'gzip, deflate' },
    e2e: {
        setupNodeEvents(on, config) {
            on(
                'file:preprocessor',
                vitePreprocessor({
                    watch: false,
                    ssr: {
                        target: 'webworker',
                    },
                    esbuild: {
                        platform: 'browser',
                        target: ['es2020', 'chrome60', 'edge18', 'firefox60', 'node12', 'safari11'],
                    },
                    resolve: {
                        alias: {
                            fs: builtIns().resolveId('fs'),
                            child_process: builtIns().resolveId('child_process'),
                        },
                    },
                    build: {
                        ssr: false,
                        modulePreload: { polyfill: true },
                        mode: 'development',
                        rollupOptions: {
                            external,
                            plugins: [
                                nodeResolve({
                                    browser: true,
                                    preferBuiltins: false,
                                    modulesOnly: true,
                                }),
                            ],
                        },
                    },
                })
            )
        },
    },
    component: {
        devServer: {
            framework: 'create-react-app',
            bundler: 'vite',
        },
    },
})
