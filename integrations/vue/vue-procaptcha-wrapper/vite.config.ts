// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import path from "node:path";
import vue from "@vitejs/plugin-vue";
import type {UserConfig} from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from 'vite-tsconfig-paths'

export default function (): UserConfig {
    return {
        plugins: [
            tsconfigPaths({

            }),
            vue(),
            dts({
                tsconfigPath: './tsconfig.json',
            }),
        ],
        build: {
            outDir: path.resolve(__dirname, "./dist"),
            emptyOutDir: true,
            lib: {
                name: "Vue Procaptcha Wrapper",
                entry: path.resolve(__dirname, './src/index.ts'),
                fileName: (format) => `index.js`,
                formats: ["es"],
            },
            rollupOptions: {
                external: ['vue',],
                output: {
                    globals: {
                        "vue": "Vue",
                    }
                }
            }
        },
    };
}
