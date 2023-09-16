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

    // const writeIndexJsFiles = (src: string) => {
    //     // loop through all contracts
    //     const contracts = fs.readdirSync(src).filter((file) => {
    //         return fs.lstatSync(`${src}/${file}`).isDirectory()
    //     })
    //     // for each contract, go through each subdir (e.g. build-extrinsic, events, etc) and generate an export
    //     const contractExports: string[] = []
    //     contracts.forEach((contract) => {
    //         const contractDir = `${src}/${contract}`
    //         const dirs = fs.readdirSync(contractDir).filter((file) => {
    //             return fs.lstatSync(`${contractDir}/${file}`).isDirectory()
    //         })
    //         // exports for the index.js file for this contract
    //         const exports: string[] = []
    //         dirs.forEach((dir) => {
    //             const name = _.upperFirst(_.camelCase(dir.toString()))
    //             // export everything for each file
    //             const files = fs.readdirSync(`${contractDir}/${dir}`).filter((file) => {
    //                 return fs.lstatSync(`${contractDir}/${dir}/${file}`).isFile()
    //             })
    //             files.forEach((file) => {
    //                 const parts = file.split('.')
    //                 const ext = parts.pop() || ''
    //                 if (ext === 'ts') {
    //                     // rename extension from ts to js
    //                     parts.push('js')
    //                     file = parts.join('.')
    //                     exports.push(`export * as ${name} from './${dir}/${file}'`)
    //                 } else if (ext === 'json') {
    //                     // export json as a default as un-named
    //                     exports.push(`export { default as ${name} } from './${dir}/${file}'`)
    //                 } else {
    //                     throw new Error(`Unknown file extension ${ext}`)
    //                 }
    //             })
    //         })
    //         // write the index.js file for this contract
    //         fs.writeFileSync(`${contractDir}/index.ts`, exports.join('\n'))
    //         contractExports.push(`export * as ${_.capitalize(contract)}Contract from './${contract}/index.js'`)
    //     })
    //     // write the index.js file for the root
    //     fs.writeFileSync(`${src}/index.ts`, contractExports.join('\n'))
    // }

    // writeIndexJsFiles(parent)
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
