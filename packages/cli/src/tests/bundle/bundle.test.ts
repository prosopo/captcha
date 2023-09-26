import { assert, describe, test } from 'vitest'
import { exec } from 'child_process'
import { getCurrentFileDirectory } from '@prosopo/util'
import { promisify } from 'util'
const execPromise = promisify(exec)

describe('provider bundle', () => {
    test('bundle runs after bundling', async () => {
        // get file location
        const dir = getCurrentFileDirectory(import.meta.url)

        // get root directory of this package
        const rootDir = dir.split('/').slice(0, -3).join('/')

        // build bundle
        await execPromise(`cd ${rootDir} && npm run build:prod`)

        // run bundle and get version
        const { stdout: runOut, stderr: runErr } = await execPromise(
            `cd ${rootDir} && node dist/bundle/provider.cli.bundle.js version`
        )
        assert(runOut.includes('Version:'))
    }, 60000)
})
