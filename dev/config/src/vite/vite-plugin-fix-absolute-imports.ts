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
import { builtinModules } from 'node:module'
import type { Plugin } from 'vite'

export default function VitePluginFixAbsoluteImports(): Plugin {
    return {
        name: 'fix-absolute-imports',
        transform(code: string, id: string) {
            for (const module of builtinModules) {
                const moduleImportRegex = new RegExp(`from "(${module}(/.*)*/.*.js)";`, 'g')
                // if matches, replace match with _module
                const matches = code.match(moduleImportRegex)
                if (matches) {
                    for (const match of matches) {
                        code = code.replace(match, `from "${module}";`)
                    }
                }
            }
            return {
                code,
            }
        },
        enforce: 'post',
    }
}
