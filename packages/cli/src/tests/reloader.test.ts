import { assert, describe, test } from 'vitest'
import { getCurrentFileDirectory } from '@prosopo/util'
import { promisify } from 'util'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('reloading api', () => {
    test.only('api reloads after changing .env file', async () => {
        // get file location
        const dir = getCurrentFileDirectory(import.meta.url)

        // get root directory of this package
        const rootDir = dir.split('/').slice(0, -2).join('/')
        console.log('rootDir', rootDir)

        // run API
        const child = spawn(`npm`, ['run', 'cli', '--', '--api'], { cwd: rootDir })

        let appended = false
        child.stdout.on('data', (data) =>
            onData(data, rootDir, appended).then((hasAppended) => {
                appended = hasAppended
                console.log('onData ran')
            })
        )

        child.stdout.on('error', (e) => {
            throw new Error(e.message)
        })

        let remainOpen = true

        child.stdout.on('close', () => {
            console.log('closed')
            remainOpen = true // change
        })

        while (remainOpen) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }, 120000)
})

const onData = async (data: any, rootDir: string, appended: boolean) => {
    console.log(`stdout:\n${data}`)
    // find out which .env file is being used
    if (data.includes('Running main process...')) {
        if (!appended) {
            const envPath = path.resolve('../../dev/scripts/.env.test')

            // modify .env file
            console.log('Modifying', envPath)
            // Append a key value pair to the .env file
            await promisify(fs.appendFile)(envPath, 'TEST=TEST\n')
            await promisify(fs.appendFile)(envPath, 'TEST1=TEST1\n')
            await promisify(fs.appendFile)(envPath, 'TEST2=TEST2\n')
            console.log('Appended to', envPath)
            return true
        }
    } else if (appended) {
        console.log('appended', data)
        assert(data.includes('Stopping API'))
    }
    return false
}
