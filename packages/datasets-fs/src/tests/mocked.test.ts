import { Flatten } from '../commands/flatten.js'
import { blake2b } from '@noble/hashes/blake2b'
import { describe, test, beforeAll, afterAll } from 'vitest'
import { captchasEqFs, fsEq, fsWalk, readDataJson, restoreRepoDir, substituteRepoDir } from './utils.js'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'
import { DataSchema } from '@prosopo/types'
import { Relocate } from '../commands/relocate.js'
import { Resize } from '../commands/resize.js'
import sharp from 'sharp'
import { sleep } from '@prosopo/util'
import { GenerateV1 } from '../commands/generateV1.js'
import { Labels } from '../commands/labels.js'

describe('dataset commands', () => {
    beforeAll(() => {
        // substitute the repo path in the data for tests
        substituteRepoDir()
    })

    afterAll(() => {
        // restore repo path back to placeholder
        restoreRepoDir()
    })

    test('labels', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${__dirname}/test_results/labels.json`
        const labels = new Labels()
        labels.logger.setLogLevel('error')
        await labels.exec({
            input,
            output,
        })
        // make sure the results are the same as the expected results
        fsEq(output, `${__dirname}/data/flat_resized/labels.json`)
    })

    test('generate v2', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${__dirname}/test_results/captchas_v2.json`
        const generate = new GenerateV1()
        generate.logger.setLogLevel('error')
        await generate.exec({
            labelled: input,
            unlabelled: input,
            overwrite: true,
            output,
            solved: 3,
            unsolved: 3,
            seed: 0,
            minCorrect: 1,
            maxCorrect: 6,
            allowDuplicates: true,
        })
        // make sure the results are the same as the expected results
        captchasEqFs(output, `${__dirname}/data/flat_resized/captchas_v2.json`)
    })

    test('generate v1', async () => {
        const input = `${__dirname}/data/flat_resized/data.json`
        const output = `${__dirname}/test_results/captchas_v1.json`
        const generate = new GenerateV1()
        generate.logger.setLogLevel('error')
        await generate.exec({
            labelled: input,
            unlabelled: input,
            overwrite: true,
            output,
            solved: 3,
            unsolved: 3,
            seed: 0,
            minCorrect: 1,
            maxCorrect: 6,
            allowDuplicates: true,
        })
        // make sure the results are the same as the expected results
        captchasEqFs(output, `${__dirname}/data/flat_resized/captchas_v1.json`)
    })

    test('resizes data', async () => {
        const input = `${__dirname}/data/flat/data.json`
        const output = `${__dirname}/test_results/flat_resized`
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
        const output = `${__dirname}/test_results/relocated_data.json`
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
        const output = `${__dirname}/test_results/flat`
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
