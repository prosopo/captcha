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
import { spawn } from 'child_process'
import { stdin } from 'process'

export interface ExecOutput {
    stdout: string
    stderr: string
    code: number | null
}

export const exec = (
    command: string,
    options?: {
        pipe?: boolean
        printCmd?: boolean
    }
): Promise<ExecOutput> => {
    let { pipe, printCmd } = options || {}
    pipe = pipe === undefined || pipe // map undefined to true
    printCmd = printCmd === undefined || printCmd // map undefined to true

    if (printCmd) {
        console.log(`[exec] ${command}`)
    }

    const prc = spawn(command, {
        shell: true,
    })

    if (pipe || pipe === undefined) {
        // https://github.com/microsoft/TypeScript/issues/44605
        // Building a second time fixes this issue
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prc.stdout.pipe(process.stdout)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prc.stderr.pipe(process.stderr)
    }
    stdin.pipe(prc.stdin)

    const stdoutData: string[] = []
    const stderrData: string[] = []
    prc.stdout.on('data', (data) => {
        stdoutData.push(data.toString())
    })
    prc.stderr.on('data', (data) => {
        stderrData.push(data.toString())
    })

    return new Promise((resolve, reject) => {
        prc.on('close', (code) => {
            if (pipe || pipe === undefined) {
                console.log('')
            }
            const output: ExecOutput = {
                stdout: stdoutData.join(''),
                stderr: stderrData.join(''),
                code,
            }
            if (code === 0) {
                resolve(output)
            } else {
                reject(output)
            }
        })
    })
}
