// Copyright 2021-2023 Prosopo (UK) Ltd.
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
// start react-scripts start as child process
import { spawn } from 'child_process'
let stderrBuffer = ''

function flushStderr() {
    if (stderrBuffer) {
        process.stderr.write(stderrBuffer + '\n')
        stderrBuffer = ''
    }
}

function startWebpackDevServer() {
    return new Promise<void>((resolve, reject) => {
        let resolved = false
        let rejected = false
        process.env.PORT = '3001'
        process.env.NODE_ENV = 'test'
        const reactScriptsProcess = spawn('webpack', ['serve'])
        reactScriptsProcess.stdout.pipe(process.stdout)
        reactScriptsProcess.stdout.addListener('data', (chunk) => {
            const msg = chunk.toString()
            if (msg.indexOf('compiled successfully') >= 0) {
                resolved = true
                resolve()
            } else if (!resolved && msg.indexOf('webpack:') >= 0) {
                rejected = true
                flushStderr()
                reject(msg)
            }
        })
    })
}

function startCypressTests() {
    return new Promise<void>((resolve, reject) => {
        let resolved = false
        let rejected = false
        const cypressProcess = spawn('cypress', ['run'])
        cypressProcess.stdout.pipe(process.stdout)
        cypressProcess.stdout.addListener('data', (chunk) => {
            const msg = chunk.toString()
            if (msg.indexOf('All specs passed!') >= 0) {
                resolved = true
                resolve()
            } else if (!resolved && msg.indexOf('webpack:') >= 0) {
                rejected = true
                flushStderr()
                reject(msg)
            }
        })
    })
}

startWebpackDevServer()
    .then(() => {
        startCypressTests()
            .then(() => {
                console.log('Cypress tests finished')
                process.exit(0)
            })
            .catch((err) => {
                console.error(err)
                process.exit(1)
            })
    })
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
