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
import { exec } from '../util/index.js'
import fs from 'fs'
import path from 'path'

async function importContract(pathToAbis: string, pathToOutput: string) {
    pathToAbis = path.relative(process.cwd(), pathToAbis)
    pathToOutput = path.relative(process.cwd(), pathToOutput)
    //TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    if (!fs.existsSync(pathToAbis)) throw new Error(`Path to ABIs does not exist: ${pathToAbis}`)
    await exec(`mkdir -p ${pathToOutput}`)
    const cmd = `npx @727-ventures/typechain-polkadot --in ${pathToAbis} --out ${pathToOutput}`
    await exec(cmd)
    // walk each file in the output directory
    const walk = (dir: string) => {
        const files = fs.readdirSync(dir)
        for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
                walk(filePath)
            } else if (filePath.endsWith('.ts')) {
                // replace the relative imports with .js extension applied
                // eslint-disable-next-line no-useless-escape
                const regex = /import[\s]+(.+?)[\s]+from[\s]+([\"\']\..+)/gm
                const fileContents = fs.readFileSync(filePath, 'utf8')
                let replaced = fileContents.replace(regex, (match, p1, p2) => {
                    const name = p1.toString()
                    const srcQuoted = p2.toString()
                    const src = getPath(srcQuoted)
                    const extension = getExtension(src)
                    let result = ''
                    if (extension === 'js') {
                        // already has .js extension
                        return match
                    } else if (extension === 'json') {
                        // needs json assertion
                        result = `import ${name} from '${src}' assert { type: 'json' }`
                    } else {
                        // needs .js extension
                        result = `import ${name} from '${src}.js'`
                    }
                    console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return `${result}`
                })
                // eslint-disable-next-line no-useless-escape
                replaced = replaced.replace(/(^(?!\s*\/\/\s*eslint).*)\n+(\s*)\/\/\s*@ts-ignore/gm, (match, p1, p2) => {
                    const result = `${p1}\n${p2}// eslint-disable-next-line @typescript-eslint/ban-ts-comment\n${p2}// @ts-ignore`
                    console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return result
                })
                fs.writeFileSync(filePath, replaced)
            }
        }
    }
    walk(pathToOutput)
}

const getExtension = (str: string) => {
    const arr = str.split('.')
    if (arr.length <= 1) {
        return ''
    }
    return arr.pop()
}

const getPath = (str: string) => {
    // get terminating quote or apostrophe
    const j = Math.max(str.lastIndexOf('"'), str.lastIndexOf("'"))
    // get start quote or apostrophe
    const i = Math.max(str.indexOf('"'), str.indexOf("'"))
    return str.slice(i + 1, j)
}

export default importContract
