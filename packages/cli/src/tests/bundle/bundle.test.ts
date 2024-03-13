import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getCurrentFileDirectory } from '@prosopo/util'
import { assert, describe, test } from 'vitest'
const execPromise = promisify(exec)

describe('provider bundle', () => {
    test('bundle runs after bundling', async () => {
        // get file location
        const dir = getCurrentFileDirectory(import.meta.url)

        // get root directory of this package
        const rootDir = dir.split('/').slice(0, -3).join('/')

        // build bundle
        await execPromise(`cd ${rootDir} && npm run bundle:prod`)

        // run bundle and get version
        const { stdout: runOut, stderr: runErr } = await execPromise(
            `cd ${rootDir} && node dist/bundle/provider.cli.bundle.js version`
        )
        assert(runOut.includes('Version:'))
    }, 120000)
})
