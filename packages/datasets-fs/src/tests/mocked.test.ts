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
import { CaptchasContainerSchema, DataSchema } from '@prosopo/types'
import { Flatten } from '../commands/flatten.js'
import { GenerateV1 } from '../commands/generateV1.js'
import { GenerateV2 } from '../commands/generateV2.js'
import { Labels } from '../commands/labels.js'
import { Relocate } from '../commands/relocate.js'
import { Resize } from '../commands/resize.js'
import { afterAll, beforeAll, describe, test } from 'vitest'
import { blake2b } from '@noble/hashes/blake2b'
import { captchasEqFs, fsEq, fsWalk, restoreRepoDir, substituteRepoDir } from './utils.js'
import { getRootDir, getTestResultsDir } from '@prosopo/config'
import { u8aToHex } from '@polkadot/util/u8a'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

describe('dataset commands', () => {
    const pkgDir = path.relative(getRootDir(), __dirname)
    const pkgInternalPath = pkgDir.replace(`${__dirname}/`, '')
    const testResultsDir = `${getTestResultsDir()}/${pkgInternalPath}`

    beforeAll(() => {
        // substitute the repo path in the data for tests
        substituteRepoDir()
        fs.mkdirSync(`${testResultsDir}`, { recursive: true })
    })

    afterAll(() => {
        // restore repo path back to placeholder
        restoreRepoDir()
        // remove test results
        if (fs.existsSync(`${testResultsDir}`)) {
            fs.rmdirSync(`${testResultsDir}`, { recursive: true })
        }
    })

    test('labels', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${testResultsDir}/labels.json`
        const labels = new Labels()
        labels.logger.setLogLevel('error')
        await labels.exec({
            input,
            output,
        })
        // make sure the results are the same as the expected results
        fsEq(output, `${__dirname}/data/flat_resized/labels.json`)

        // make sure there's one class per hierarchical directory
        const content = fs.readFileSync(output).toString()
        const labelsJson = JSON.parse(content.toString())
        const foundLabels = labelsJson.labels as string[]
        const categories = fs.readdirSync(`${__dirname}/data/hierarchical`)
        if (JSON.stringify(foundLabels) !== JSON.stringify(categories)) {
            throw new Error(`expected ${categories} but found ${foundLabels}`)
        }
    })

    test('generate v2', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${testResultsDir}/captchas_v2.json`
        const minIncorrect = 1
        const minCorrect = 1
        const minLabelled = 2
        const maxLabelled = 7
        const generate = new GenerateV2()
        generate.logger.setLogLevel('error')
        await generate.exec({
            labelled: input,
            unlabelled: input,
            overwrite: true,
            output,
            count: 100,
            seed: 0,
            minIncorrect,
            minCorrect,
            minLabelled,
            maxLabelled,
            allowDuplicates: true,
        })
        // make sure the results are the same as the expected results
        if (!captchasEqFs(output, `${__dirname}/data/flat_resized/captchas_v2.json`)) {
            throw new Error(`captchas not equal`)
        }

        // test that the solutions array and unlabelled array per captcha never conflict
        const content = fs.readFileSync(output).toString()
        const captchasJson = JSON.parse(content.toString())
        const captchas = CaptchasContainerSchema.parse(captchasJson)
        for (const captcha of captchas.captchas) {
            const solutions = captcha.solution
            const unlabelled = captcha.unlabelled
            // both should not be undefined
            if (solutions === undefined || unlabelled === undefined) {
                console.log(captcha)
                throw new Error(`solutions or unlabelled array is undefined`)
            }
            for (const solution of solutions) {
                // solution should not be in unlabelled
                if (unlabelled.includes(solution)) {
                    throw new Error(`solution ${solution} is also in unlabelled array`)
                }
            }
            // check the correct, incorrect, labelled and unlabelled distribution
            const nCorrect = solutions.length
            const nUnlabelled = unlabelled.length
            const nIncorrect = 9 - nCorrect - nUnlabelled
            const nLabelled = nCorrect + nIncorrect
            if (nCorrect < minCorrect) {
                throw new Error(`expected at least ${minCorrect} correct but found ${nCorrect}`)
            }
            if (nIncorrect < minIncorrect) {
                throw new Error(`expected at least ${minIncorrect} incorrect but found ${nIncorrect}`)
            }
            if (nLabelled < minLabelled) {
                throw new Error(`expected at least ${minLabelled} labelled but found ${nLabelled}`)
            }
            if (nLabelled > maxLabelled) {
                throw new Error(`expected at most ${maxLabelled} labelled but found ${nLabelled}`)
            }
            if (nUnlabelled !== 9 - nLabelled) {
                throw new Error(`expected ${9 - nLabelled} unlabelled but found ${nUnlabelled}`)
            }
        }
    })

    test('generate v1', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${testResultsDir}/captchas_v1.json`
        const generate = new GenerateV1()
        generate.logger.setLogLevel('error')
        await generate.exec({
            labelled: input,
            unlabelled: input,
            overwrite: true,
            output,
            solved: 50,
            unsolved: 50,
            seed: 0,
            minCorrect: 1,
            maxCorrect: 6,
            allowDuplicates: true,
        })
        // make sure the results are the same as the expected results
        if (!captchasEqFs(output, `${__dirname}/data/flat_resized/captchas_v1.json`)) {
            throw new Error(`captchas not equal`)
        }
    })

    test('resizes data', async () => {
        const input = `${__dirname}/data/flat/data.json`
        const output = `${testResultsDir}/flat_resized`
        const resize = new Resize()
        resize.logger.setLogLevel('error')
        await resize.exec({
            input,
            output,
            overwrite: true,
            square: true,
            size: 128,
        })

        // make sure the results are the same as the expected results
        const expected = `${__dirname}/data/flat_resized`
        fsEq(output, expected)

        // check data in resized dir is all 128x128
        for (const pth of fsWalk(output)) {
            // if pth is not img, ignore
            if (!pth.endsWith('.jpg') && !pth.endsWith('.jpeg') && !pth.endsWith('.png')) {
                continue
            }
            const image = sharp(pth)
            const metadata = await image.metadata()
            if (metadata.width !== 128 || metadata.height !== 128) {
                throw new Error(`image ${pth} is not 128x128`)
            }
        }
    })

    test('relocates data', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${testResultsDir}/relocated_data.json`
        const relocate = new Relocate()
        relocate.logger.setLogLevel('error')
        await relocate.exec({
            input,
            output,
            overwrite: true,
            to: 'newwebsite.com',
            from: '${repo}',
        })

        // make sure the results are the same as the expected results
        const expected = `${__dirname}/data/flat_resized/relocated_data.json`
        fsEq(output, expected)
    })

    test('flattens hierarchical data', async () => {
        const input = `${__dirname}/data/hierarchical`
        const output = `${testResultsDir}/flat`
        const flatten = new Flatten()
        flatten.logger.setLogLevel('error')
        await flatten.exec({
            input,
            output,
            overwrite: true,
        })

        // make sure the results are the same as the expected results
        const expected = `${__dirname}/data/flat`
        fsEq(output, expected)

        // read data json
        const content = fs.readFileSync(`${output}/data.json`).toString()
        const dataJson = JSON.parse(content.toString())
        const data = DataSchema.parse(dataJson)

        // check each image from the hierarchical data is in the flat data
        let hierCount = 0
        for (const pth of fsWalk(input)) {
            // if pth is not img, ignore
            if (!pth.endsWith('.jpg') && !pth.endsWith('.jpeg') && !pth.endsWith('.png')) {
                continue
            }
            hierCount++
            // get the category
            const category = pth.split('/').slice(-2)[0]
            const content = fs.readFileSync(pth)
            // check the image is in the flat data
            let name = ''
            for (const pth2 of fsWalk(output)) {
                // if pth2 is not file, ignore
                if (!fs.statSync(pth2).isFile()) {
                    continue
                }
                const content2 = fs.readFileSync(pth2)
                if (content.equals(content2)) {
                    const str = pth2.split('/').slice(-1)[0]
                    if (str === undefined) {
                        throw new Error(`unable to parse ${pth2}`)
                    }
                    name = str
                    break
                }
            }

            if (!name) {
                throw new Error(`unable to find image ${pth} in output`)
            }
            // check the image is in the data json
            const item = data.items.find((item) => {
                const name2 = item.data.split('/').slice(-1)[0]
                if (name2 !== name) {
                    return false
                }
                return true
            })
            if (item === undefined) {
                throw new Error(`unable to find image ${pth} in data.json`)
            }
            // correct name, so check category
            if (item.label != category) {
                throw new Error(`expected ${category} but found ${item.label}`)
            }
            // type should be image
            if (item.type !== 'image') {
                throw new Error(`expected image type but found ${item.type}`)
            }
            // file name should be the hash
            if (item.hash !== name.split('.')[0]) {
                throw new Error(`expected ${name.split('.')[0]} hash but found ${item.hash}`)
            }
            // hash should be the hash of the image content
            const hash = u8aToHex(blake2b(content))
            if (item.hash !== hash) {
                throw new Error(`expected ${hash} hash but found ${item.hash}`)
            }
        }

        // count the number of images in the flat data
        let flatCount = 0
        for (const pth of fsWalk(output)) {
            if (!pth.endsWith('.jpg') && !pth.endsWith('.jpeg') && !pth.endsWith('.png')) {
                continue
            }
            flatCount++
        }

        // check same number of images in flat data
        if (hierCount !== flatCount) {
            throw new Error(`expected ${hierCount} images but found ${flatCount}`)
        }
    })
})
