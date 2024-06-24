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
import { ProsopoEnvError } from '@prosopo/common'
import { exec } from '../util/index.js'
import { lodash } from '@prosopo/util/lodash'
import fs from 'fs'
import path from 'path'

type TypeChainDir = {
    dir: string
    defaultExportName?: string
    exports?: {
        name: string
        alias?: string
    }[]
}

type ExportType = {
    name: string
    category: string
}

const replaceExtension = (file: string, ext: string): string => {
    const parts = file.split('.')
    parts.pop()
    parts.push(ext)
    return parts.join('.')
}

async function importContract(pathToAbis: string, pathToOutput: string) {
    const verbose = false
    pathToAbis = path.relative(process.cwd(), pathToAbis)
    pathToOutput = path.relative(process.cwd(), pathToOutput)
    // TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    if (!fs.existsSync(pathToAbis))
        throw new ProsopoEnvError('FS.FILE_NOT_FOUND', {
            context: { error: `Path to ABIs does not exist: ${pathToAbis}` },
        })
    await exec(`mkdir -p ${pathToOutput}`)
    const cmd = `npx @prosopo/typechain-polkadot --in ${pathToAbis} --out ${pathToOutput}`
    await exec(cmd)
    const name = path.basename(pathToAbis)
    // copy the metadata
    // TODO this is a temp fix. This functionality should be in typechain!
    await exec(`cp ${pathToAbis}/${name}.json ${pathToOutput}/${name}.json`)
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
                const regex = /(import(?:(?!from).)+from\s+)(['"]\.[./\w-]+['"])(\s+assert\s+\{[^}]*\})?/gs
                const fileContents = fs.readFileSync(filePath, 'utf8')
                let replaced = fileContents.replace(regex, (match, p1, p2, p3) => {
                    const start = p1.toString()
                    const srcQuoted = p2.toString()
                    const src = getPath(srcQuoted)
                    const extension = getExtension(src)
                    if (verbose) console.log(`src: ${src}`)
                    if (verbose) console.log(`extension: ${extension}`)
                    if (verbose) console.log('p3: ', p3)
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
                    if (verbose) console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return `${result}`
                })
                // eslint-disable-next-line no-useless-escape
                replaced = replaced.replace(/\n(.*)\n(\s*)\/\/\s*@ts-ignore/g, (match, p1, p2) => {
                    // don't replace if already ignored by eslint
                    if (p1.includes('eslint-disable-next-line')) return match
                    const result = `\n${p1}\n${p2}// eslint-disable-next-line @typescript-eslint/ban-ts-comment\n${p2}// @ts-ignore`
                    if (verbose) console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return result
                })

                // replace EventRecord with EventRecord[]
                // eslint-disable-next-line no-useless-escape
                replaced = replaced.replace(/: EventRecord\)/g, (match) => {
                    const result = `: EventRecord[])`
                    if (verbose) console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                    return result
                })

                // replace EventRecord incorrect imports
                // eslint-disable-next-line no-useless-escape
                replaced = replaced.replace(
                    /import\s+type\s+\{\s*EventRecord\s*\}\s+from\s+['"]@polkadot\/api\/submittable["']/g,
                    (match) => {
                        const result = `import type { EventRecord } from '@polkadot/types/interfaces'`
                        if (verbose) console.log(`Replacing \n\t${match}\nwith\n\t${result}\nin ${filePath}`)
                        return result
                    }
                )

                fs.writeFileSync(filePath, replaced)
            }
        }
    }
    walk(pathToOutput)

    const _ = lodash()

    const writeIndexJsFiles = (src: string) => {
        // loop through all dirs
        const typeChainDirs = fs.readdirSync(src).filter((file) => {
            return fs.lstatSync(`${src}/${file}`).isDirectory()
        })
        const rootExports: string[] = []
        // for each dir (e.g. build-extrinsic, constructors, etc) generate an index.js file with exports for each contract
        // need to do specific exports per dir as it depends on the typechain export as to how we want to name the index.js export
        const typeChainExports: TypeChainDir[] = [
            {
                dir: 'build-extrinsic',
                defaultExportName: 'extrinsics',
            },
            {
                dir: 'constructors',
            },
            {
                dir: 'contract-info',
                exports: [
                    {
                        name: 'ContractAbi',
                    },
                    {
                        name: 'ContractFile',
                    },
                ],
            },
            {
                dir: 'contracts',
                defaultExportName: 'contract',
            },
            {
                dir: 'data',
            },
            {
                dir: 'event-data',
            },
            // { // no events used so this is empty - not sure about structure so left out
            //     dir: 'event-types'
            // },
            {
                dir: 'events',
            },
            {
                dir: 'mixed-methods',
                defaultExportName: 'methods',
            },
            {
                dir: 'query',
                defaultExportName: 'query',
            },
            {
                dir: 'tx-sign-and-send',
                defaultExportName: 'tx',
            },
        ]
        let file = ''
        // for each typechain dir, generate exports
        typeChainExports.forEach((typeChainExport) => {
            const dirPath = `${src}/${typeChainExport.dir}`
            // there will be a single file named after the contract
            const files = fs.readdirSync(dirPath)
            if (files.length !== 1) {
                throw new ProsopoEnvError('FS.INVALID_DIR_FORMAT', {
                    context: { error: `Expected 1 file in ${dirPath}, found ${files.length}` },
                })
            }
            file = files[0] || ''
            if (file === '') {
                throw new ProsopoEnvError('FS.FILE_NOT_FOUND', { context: { error: `No file found in ${dirPath}` } })
            }
            if (file.endsWith('.ts')) {
                // rename extension from ts to js
                file = replaceExtension(file, 'js')
            }

            // process default export, if any
            if (typeChainExport.defaultExportName !== undefined) {
                const name = _.upperFirst(_.camelCase(typeChainExport.defaultExportName || typeChainExport.dir))
                rootExports.push(`export { default as ${name} } from './${typeChainExport.dir}/${file}'`)
            }
            // process named exports, if any
            if (typeChainExport.exports !== undefined) {
                typeChainExport.exports.forEach((namedExport) => {
                    const alias = namedExport.alias ? ` as ${namedExport.alias}` : ''
                    rootExports.push(`export { ${namedExport.name}${alias} } from './${typeChainExport.dir}/${file}'`)
                })
            }
        })

        // shared dir is special, contains util fns. Export all
        rootExports.push(`export * from './shared/utils.js'`)

        // type-arguments and type-returns often have duplicate types. We want to export only a single type for each type, so go through and detect duplicates
        const regex = /export\s+([a-z]+)\s+(\w+)/g
        const fileTs = replaceExtension(file, 'ts')
        const typesArgumentsFileContent = fs.readFileSync(`${src}/types-arguments/${fileTs}`, 'utf8')
        const typesReturnsFileContent = fs.readFileSync(`${src}/types-returns/${fileTs}`, 'utf8')
        const argumentTypes: ExportType[] = Array.from(typesArgumentsFileContent.matchAll(regex)).map((match) => {
            return {
                name: match[2] || '',
                category: match[1] || '',
            }
        })
        const returnTypes: ExportType[] = Array.from(typesReturnsFileContent.matchAll(regex)).map((match) => {
            return {
                name: match[2] || '',
                category: match[1] || '',
            }
        })
        const argumentTypeNames = argumentTypes.map((entry) => entry.name)
        const uniqueTypes = [...argumentTypes]
        const locations: string[] = [...argumentTypes.map(() => 'types-arguments')]
        returnTypes.forEach((entry) => {
            if (!argumentTypeNames.includes(entry.name)) {
                uniqueTypes.push(entry)
                locations.push('types-arguments')
            } else {
                locations.push('types-returns')
            }
        })
        uniqueTypes.forEach((entry, i) => {
            const location = locations[i]
            const prefix = entry.category === 'type' || entry.category === 'interface' ? ' type' : ''
            rootExports.push(`export${prefix} { ${entry.name} } from './${location}/${file}'`)
        })

        // write the index.js file for the root
        fs.writeFileSync(`${src}/index.ts`, rootExports.join('\n'))
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
