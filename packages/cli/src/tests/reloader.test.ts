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
import { describe, expect, test } from 'vitest'
import { getCurrentFileDirectory } from '@prosopo/util'
import { promisify } from 'util'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('reloading api', () => {
    test('api reloads after changing .env file', () => {
        // get file location
        const dir = getCurrentFileDirectory(import.meta.url)

        // get root directory of this package
        const rootDir = dir.split('/').slice(0, -2).join('/')

        const restoreEnv = async () => {
            const envPath = path.resolve(`${rootDir}/.env.test`)
            const envContent = await promisify(fs.readFile)(envPath, 'utf8')
            const newEnvContent = envContent.replace('\nTEST=TEST', '')
            await promisify(fs.writeFile)(envPath, newEnvContent)
        }

        return new Promise<void>((resolve, reject) => {
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
                    // console.log('onData ran, appended', appended, 'kill', kill)
                    if (kill) {
                        child.kill()
                        expect(appended).toBe(true)
                        resolve()
                    }
                })
            )

            child.stdout.on('error', reject)
        })
            .then(restoreEnv)
            .catch((error) => {
                restoreEnv()
                throw error
            })
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
            await promisify(fs.appendFile)(envPath, '\nTEST=TEST')
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
