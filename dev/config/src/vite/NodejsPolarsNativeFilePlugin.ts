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
import type { Logger } from '@prosopo/common'
import fs from 'node:fs'
import path from 'node:path'

export const nodejsPolarsNativeFilePlugin = (logger: Logger, nodeFiles: string[], outDir: string) => {
    const name = 'nodejs-polars-native-file-plugin'
    return {
        name,
        resolveId(source: string, importer: string | undefined, options: any) {
            // return the id if this plugin can resolve the import
            for (const file of nodeFiles) {
                if (path.basename(source) === path.basename(file)) {
                    logger.debug(name, 'resolves', source, 'imported by', importer)
                    return source
                }
            }
            return null // otherwise return null indicating that this plugin can't handle the import
        },
        transform(code: string, id: string) {
            for (const file of nodeFiles) {
                // rewrite the code to import the .node file
                if (path.basename(id) === path.basename(file)) {
                    logger.debug(name, 'transform', id)
                    // https://stackoverflow.com/questions/66378682/nodejs-loading-es-modules-and-native-addons-in-the-same-project
                    // this makes the .node file load at runtime from an esm context. .node files aren't native to esm, so we have to create a custom require function to load them. The custom require function is equivalent to the require function in commonjs, thus allowing the .node file to be loaded.
                    return `
                        // create a custom require function to load .node files
                        import { createRequire } from 'module';
                        const customRequire = createRequire(import.meta.url)
    
                        // load the .node file expecting it to be in the same directory as the output bundle
                        const content = customRequire('./${file}')
    
                        // export the content straight back out again
                        export default content
                        `
                }
            }
            return code
        },
        load(id: string) {
            for (const file of nodeFiles) {
                if (path.basename(id) === path.basename(file)) {
                    logger.debug(name, 'load', id)
                    // whenever we encounter an import of the .node file, we return an empty string. This makes it look like the .node file is empty to the bundler. This is because we're going to copy the .node file to the output directory ourselves, so we don't want the bundler to include it in the output bundle (also because the bundler can't handle .node files, it tries to read them as js and then complains that it's invalid js)
                    const newCode = ""
                    return newCode
                }
            }
            return null
        },
        generateBundle(options: any, bundle: any) {
            for (const fileAbs of nodeFiles) {
                const file = path.basename(fileAbs)
                // copy the .node file to the output directory
                const out = `${outDir}/${file}`
                const src = `${fileAbs}`
                logger.debug(name, 'copy', src, 'to', out)
                const nodeFile = fs.readFileSync(src)
                fs.mkdirSync(path.dirname(out), { recursive: true })
                fs.writeFileSync(out, nodeFile)
            }
        },
    }
}
