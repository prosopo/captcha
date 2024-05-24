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
import { exec } from 'child_process'

const main = async () => {
    console.log('running precommit hook')

    // get the the current branch name
    const branch = await new Promise<string>((resolve, reject) => {
        exec('git rev-parse --abbrev-ref HEAD', (err, stdout, stderr) => {
            if (err) {
                reject(err)
            } else {
                resolve(stdout.trim())
            }
        })
    })

    // get the name of the default branch (usually 'main')
    const defaultBranch = await new Promise<string>((resolve, reject) => {
        exec("git remote show origin | grep 'HEAD branch'", (err, stdout, stderr) => {
            if (err) {
                reject(err)
            } else {
                const parts = stdout.split(': ')
                if (parts.length !== 2) {
                    reject(new Error('could not find default branch'))
                }
                const branch = (parts[1] as string).trim()
                resolve(branch)
            }
        })
    })

    if (branch === defaultBranch) {
        throw new Error(
            `Commits to the default branch (${defaultBranch}) are not allowed. Please create a branch and submit a pull request.`
        )
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
