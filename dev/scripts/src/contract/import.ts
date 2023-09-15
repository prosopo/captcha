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
import { lodash } from '@prosopo/util'
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
                const regex = /(import(?:(?!from).)+from\s+)(['"]\.[.\/a-zA-Z0-9-_]+?['"])(\s+assert\s+{[^}]*})?/gms
                const fileContents = fs.readFileSync(filePath, 'utf8')
                let replaced = fileContents.replace(regex, (match, p1, p2, p3) => {
                    const start = p1.toString()
                    const srcQuoted = p2.toString()
                    const src = getPath(srcQuoted)
                    const extension = getExtension(src)
                    console.log(`src: ${src}`)
                    console.log(`extension: ${extension}`)
                    console.log('p3: ', p3)
                    let result = ''
                    if (extension === 'js') {
                        // already has .js extension
                        return match
                    } else if (extension === 'json') {
                        if ((p3 ?? '').includes('assert')) {
                            // already has assert
                            return match
                        }
                        // needs json assertion
                        result = `${start}'${src}' assert { type: 'json' }`
                    } else {
                        // needs .js extension
                        result = `${start}'${src}.js'`
                    }
                    console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return `${result}`
                })
                // eslint-disable-next-line no-useless-escape
                replaced = replaced.replace(/\n(.*)\n(\s*)\/\/\s*@ts-ignore/gm, (match, p1, p2) => {
                    // don't replace if already ignored by eslint
                    if (p1.includes('eslint-disable-next-line')) return match
                    const result = `\n${p1}\n${p2}// eslint-disable-next-line @typescript-eslint/ban-ts-comment\n${p2}// @ts-ignore`
                    console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return result
                })
                fs.writeFileSync(filePath, replaced)
            }
        }
    }
    walk(pathToOutput)

    const _ = lodash()
    
    const writeIndexJsFiles = (src: string, parentName: string = '') => {
        // find all files in dir
        const files = fs.readdirSync(src)
        let str = ''
        // for each file, add an export
        files.forEach((file) => {
            if(file === 'index.ts') {
                return
            }
            const filePath = `${src}/${file}`
            const isDir = fs.lstatSync(filePath).isDirectory()
            const parts = file.split('.')
            const fileName = parts[0]
            const camel = _.camelCase(fileName)
            const name = _.upperFirst(camel)
            if(file.endsWith('.json')) {
                str += `export { default as ${name}${parentName} } from './${file}'\n`
            } else if(!isDir) {
                str += `export * as ${name}${parentName} from './${fileName}.js'\n`
            } else {
                str += `export * from './${fileName}/index.js'\n`
            }
            // if directory, recurse
            if (isDir) {
                writeIndexJsFiles(filePath, name)
            }
        })
        // write the index file
        fs.writeFileSync(`${src}/index.ts`, str)
    }

    writeIndexJsFiles(pathToOutput)
}

const getExtension = (str: string) => {
    const i = str.indexOf('assert')
    if (i >= 0) {
        // discard everything including and after assert
        str = str.slice(0, i)
    }
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
