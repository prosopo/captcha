import { Flatten } from '../commands/flatten.js'
import { blake2b } from '@noble/hashes/blake2b'
import { describe, test, beforeAll, afterAll } from 'vitest'
import { fsEq, fsWalk, readDataJson, restoreRepoDir, substituteRepoDir } from './utils.js'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'
import sharp from 'sharp'
import { Relocate } from '../commands/relocate.js'

describe('relocate', () => {
    beforeAll(() => {
        // substitute the repo path
        substituteRepoDir()
    })

    afterAll(() => {
        // restore repo path
        restoreRepoDir()
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
        const expected = `${__dirname}/data/relocated_data.json`
        fsEq(output, expected)
    })
})
