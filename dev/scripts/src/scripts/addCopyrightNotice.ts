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
import { at } from '@prosopo/util'
import { getRootDir } from '@prosopo/config'
import { glob } from 'glob'
import fs from 'fs'

const searchPaths = [
    '**/*.ts',
    '**/*.tsx',
    '**/*.rs',
    '**/*.js',
    '**/*.jsx',
    '**/*.cjs',
    '**/*.mjs',
    '**/*.cts',
    '**/*.mts',
]

const currentPath = getRootDir()

const files = glob.sync(searchPaths, {
    cwd: currentPath,
    absolute: true,
    ignore: [
        '**/node_modules/**',
        '**/cargo-cache/**',
        '**/dist/**',
        '**/target/**',
        '**/coverage/**',
        '**/vite.cjs.config.ts.timestamp*',
    ],
}).filter(file => fs.lstatSync(file).isFile())

if (process.argv[2] === 'list') {
    console.log(JSON.stringify(files, null, 4))
    console.log('Found', files.length, 'files')
    if (process.env['CI']) {
        console.log('running in CI, exiting')
        process.exit(1)
    }
}

if (process.argv[2] === 'license') {
    const header = `// Copyright 2021-2024 Prosopo (UK) Ltd.
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
// limitations under the License.`

    //for each file, check if file contains // Copyright (C) Prosopo (UK) Ltd.
    for (const file of files) {
        //check if file is a file, not a directory
        const fileContents = fs.readFileSync(file, 'utf8')
        const lines = fileContents.split('\n')
        if (fileContents.indexOf('// Copyright') > -1) {
            //remove the old license and replace with the new one
            // find the line containing `// along with Prosopo Procaptcha.  If not, see <http://www.gnu.org/licenses/>.` and take the lines array from there
            let count = 0
            let line = at(lines, count)
            let lineStartsWithSlashes = line.startsWith('//')
            while (lineStartsWithSlashes) {
                lineStartsWithSlashes = line.startsWith('//')
                if (lineStartsWithSlashes) {
                    line = at(lines, ++count)
                }
            }
            if (!line.startsWith('//')) {
                count = count - 1
                line = at(lines, count)
            }
            if (
                line.endsWith('If not, see <http://www.gnu.org/licenses/>.') ||
                line.endsWith('// limitations under the License.')
            ) {
                const newFileContents = `${header}\n${lines.slice(count + 1).join('\n')}`

                if (newFileContents !== fileContents) {
                    //console.log(newFileContents)
                    fs.writeFileSync(file, newFileContents)
                    console.log('File Updated:', file)
                }
            }
        } else {
            // if it doesn't, add it
            const newFileContents = `${header}\n${fileContents}`
            //console.log(newFileContents)
            fs.writeFileSync(file, newFileContents)
            console.log('File Updated:', file)
        }
    }
}
