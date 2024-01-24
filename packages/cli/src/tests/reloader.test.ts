import { describe, expect, test } from 'vitest'
import { getCurrentFileDirectory } from '@prosopo/util'
import { promisify } from 'util'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('reloading api', () => {
    test('api reloads after changing .env file', async () => {
        try {
            // get file location
            const dir = getCurrentFileDirectory(import.meta.url)

            // get root directory of this package
            const rootDir = dir.split('/').slice(0, -2).join('/')
            console.log('rootDir', rootDir)

            // run API
            const child = spawn(`npm`, ['run', 'cli', '--', '--api'], {
                cwd: rootDir,
                env: { ...process.env, NODE_ENV: 'test' },
            })

            let appended = false
            child.stdout.on('data', (data) =>
                onData(data, rootDir, appended).then((result) => {
                    appended = result.appended
                    const kill = result.kill
                    console.log('onData ran, appended', appended, 'kill', kill)
                    if (kill) {
                        child.kill()
                        expect(appended).toBe(true)
                        remainOpen = false
                    }
                })
            )

            child.stdout.on('error', (e) => {
                console.log('error', e)
                process.exit(1)
            })

            let remainOpen = true

            child.stdout.on('close', (result: any) => {
                console.log('closed', result)
                remainOpen = true // change
            })

            while (remainOpen) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        } catch (e) {
            console.log('error', e)
            process.exit(1)
        }
    }, 120000)
})

const onData = async (data: any, rootDir: string, appended: boolean): Promise<{ appended: boolean; kill: boolean }> => {
    console.log(`stdout:\n${data}`)
    await new Promise((resolve) => setTimeout(resolve, 500))

    // find out which .env file is being used
    if (data.includes('Running main process...')) {
        if (!appended) {
            const envPath = path.resolve(`${rootDir}/.env.test`)

            // Append a key value pair to the .env file
            await promisify(fs.appendFile)(envPath, 'TEST=TEST\n')
            return {
                appended: true,
                kill: false,
            }
        }
    }
    if (appended) {
        return { appended: true, kill: data.includes('Stopping API') }
    }
    return { appended: false, kill: false }
}
