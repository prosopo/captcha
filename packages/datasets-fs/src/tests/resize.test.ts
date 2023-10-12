import { Flatten } from '../commands/flatten.js'
import { blake2b } from '@noble/hashes/blake2b'
import { describe, test, beforeAll, afterAll } from 'vitest'
import { fsEq, fsWalk, readDataJson, restoreRepoDir, substituteRepoDir } from './utils.js'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'
import { Resize } from '../commands/resize.js'
import sharp from 'sharp'

describe('resize', () => {

    beforeAll(() => {
        // substitute the repo path
        substituteRepoDir()
    })

    afterAll(() => {
        // restore repo path
        restoreRepoDir()
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
            if (!pth.endsWith('.jpg') && !pth.endsWith('.png')) {
                continue
            }
            const image = sharp(pth)
            const metadata = await image.metadata()
            if (metadata.width !== 128 || metadata.height !== 128) {
                throw new Error(`image ${pth} is not 128x128`)
            }
        }
    })
})
