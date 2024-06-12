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
import { getCliPkgDir, getRootDir } from '@prosopo/config'
import { promisify } from 'util'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('reloading api', () => {
    test('api reloads after changing .env file', () => {
        // check for the env file in either the root or the package directory
        const envFile = `.env.${process.env.NODE_ENV || 'development'}`
        console.log('env file ', envFile)
        const rootDir = getRootDir()
        const packageDir = getCliPkgDir()
        const rootEnvPath = `${rootDir}/${envFile}`
        const packageEnvPath = `${packageDir}/${envFile}`
        let envPath = ''
        if (fs.existsSync(rootEnvPath)) {
            envPath = path.resolve(rootEnvPath)
        } else if (fs.existsSync(packageEnvPath)) {
            envPath = path.resolve(packageEnvPath)
        } else {
            throw new Error(`No ${envFile} file found`)
        }

        const restoreEnv = async () => {
            const envContent = await promisify(fs.readFile)(envPath, 'utf8')
            const newEnvContent = envContent.replace('\nTEST=TEST', '')
            await promisify(fs.writeFile)(envPath, newEnvContent)
        }

        return new Promise<void>((resolve, reject) => {
            console.log('packageDir', packageDir)

            // run API
            const child = spawn(`npm`, ['run', 'cli', '--', '--api'], {
                cwd: packageDir,
                env: { ...process.env, NODE_ENV: 'test' },
            })

            let appended = false
            child.stdout.on('data', (data) =>
                onData(data, packageDir, appended).then((result) => {
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
    }, 600000)
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
