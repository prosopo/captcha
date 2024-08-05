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
import fs from 'node:fs'
import path from 'node:path'

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
