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
import { Logger } from '@prosopo/common'
import { at } from '@prosopo/util'
import { getEnv } from '@prosopo/cli'
import { glob } from 'glob'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const ignore = [
    'node_modules/**',
    'node_modules/**',
    '../../**/node_modules/**',
    '../node_modules/**',
    '../../node_modules/**',
]
const __dirname = path.resolve()
export async function findEnvFiles(logger: Logger) {
    const env = getEnv()
    const fileName = `.env.${env}`
    // options is optional
    logger.info('Searching for files')
    return await glob.glob(`../../**/${fileName}`, {
        ignore: ignore,
    })
}

export async function updateDemoHTMLFiles(varMatchers: RegExp[], varValue: string, logger: Logger) {
    // replace the site key in the html files
    const files = await glob.glob('../../demos/**/*.html', {
        ignore: ignore,
    })
    logger.info('HTML files found', files)
    files.forEach((file) => {
        // the following code loads a .env file, searches for the variable and replaces it
        // then saves the file
        const filePath = path.resolve(process.cwd(), file)
        const contents = fs.readFileSync(filePath).toString()
        let newContents = contents
        for (const varMatcher of varMatchers) {
            const matches = contents.match(varMatcher)
            if (matches) {
                // replace the site key
                const matchedVar = at(matches, 1)
                logger.info('matchedVar', matchedVar)
                newContents = contents.replaceAll(matchedVar, varValue)
                break
            }
        }

        if (newContents !== contents) {
            // write the file back
            fs.writeFileSync(path.resolve(__dirname, filePath), newContents)
        }
    })
}

export async function updateEnvFiles(varNames: string[], varValue: string, logger: Logger) {
    const files = await findEnvFiles(logger)
    logger.info('Env files found', files)
    files.forEach((file) => {
        let write = false
        // the following code loads a .env file, searches for the variable and replaces it
        // then saves the file
        const filePath = path.resolve(process.cwd(), file)
        const envConfig = dotenv.parse(fs.readFileSync(filePath))
        for (const varName of varNames) {
            if (varName in envConfig) {
                envConfig[varName] = varValue
                write = true
            }
        }
        if (write) {
            // write the file back
            fs.writeFileSync(
                path.resolve(__dirname, filePath),
                Object.keys(envConfig)
                    .map((k) => `${k}=${envConfig[k]}`)
                    .join('\n')
            )
        }
    })
}
