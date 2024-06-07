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
import type { Plugin } from 'vite'

interface SourcemapExclude {
    excludeNodeModules?: boolean
}
// Taken from https://github.com/vitejs/vite/issues/2433#issuecomment-1487472995 to prevent memory leaks
export default function VitePluginSourcemapExclude(opts?: SourcemapExclude): Plugin {
    return {
        name: 'sourcemap-exclude',
        transform(code: string, id: string) {
            if (opts?.excludeNodeModules && id.includes('node_modules')) {
                return {
                    code,
                    // https://github.com/rollup/rollup/blob/master/docs/plugin-development/index.md#source-code-transformations
                    map: { mappings: '' },
                }
            }
            return
        },
    }
}
