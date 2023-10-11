import { Flatten } from '../commands/flatten.js'
import { blake2b } from '@noble/hashes/blake2b'
import { describe, test } from 'vitest'
import { fsEq, fsWalk, readDataJson } from './utils.js'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'

describe('flatten', () => {
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

        const data = readDataJson(`${output}/data.json`)
        // check each image from the hierarchical data is in the flat data
        let hierCount = 0
        for (const pth of fsWalk(input)) {
            // if pth is not img, ignore
            if (!pth.endsWith('.jpg') && !pth.endsWith('.png')) {
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
            if (!pth.endsWith('.jpg') && !pth.endsWith('.png')) {
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
