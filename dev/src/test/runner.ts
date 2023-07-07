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
import { DatabaseTypes, EnvironmentTypesSchema, ProsopoConfigSchema } from '@prosopo/types'
import { Logger, ProsopoEnvError, logger } from '@prosopo/common'
import { getLogLevel, loadEnv } from '@prosopo/cli'
import { glob } from 'glob'
require('ts-mocha')
import Mocha from 'mocha'
loadEnv()
const logLevel = getLogLevel()
const testConfig = {
    logLevel,
    contract: { abi: '../contract/src/abi/prosopo.json' }, // Deprecated for abiJson.
    defaultEnvironment: EnvironmentTypesSchema.enum.development,
    account: {
        password: '',
        address: '',
    },
    networks: {
        development: {
            endpoint: process.env.SUBSTRATE_NODE_URL!,
            contract: {
                address: process.env.PROTOCOL_CONTRACT_ADDRESS!,
                name: 'prosopo',
            },
            accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
        },
    },

    captchas: {
        solved: {
            count: 1,
        },
        unsolved: {
            count: 1,
        },
    },
    captchaSolutions: {
        requiredNumberOfSolutions: 3,
        solutionWinningPercentage: 80,
        captchaFilePath: './tests/mocks/data/captchas.json', // not used
        captchaBlockRecency: 10,
    },
    database: {
        development: { type: DatabaseTypes.enum.mongoMemory, endpoint: '', dbname: 'prosopo_test', authSource: '' },
    },
    assets: {
        absolutePath: '',
        basePath: '',
    },
    server: {
        baseURL: 'http://localhost',
        port: 9229,
        fileServePaths: '[]',
    },
    batchCommit: {
        interval: 1000000,
        maxBatchExtrinsicPercentage: 59,
    },
}

export async function findTestFiles(logger: Logger): Promise<string[]> {
    const fileName = `*.test.ts`
    // options is optional
    logger.info('Searching for files')
    return await glob.glob([`../**/${fileName}`], {
        ignore: [
            'node_modules/**',
            'node_modules/**',
            '../../**/node_modules/**',
            '../node_modules/**',
            '../../node_modules/**',
        ],
    })
}

// const mochaConfig = {
//     // Specify "require" for CommonJS
//     require: 'ts-node/register',
//     // Specify "loader" for native ESM
//     loader: 'ts-node/esm',
//     extensions: ['ts', 'tsx'],
//     spec: ['tests/**/*.test.*'],
//     'watch-files': ['src'],
//     inspect: true,
// }

async function runMochaTests(files, log) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        try {
            const numberOfFailures = 0
            //You cannot use it.only, describe.only, this.only(), etc., in parallel mode.
            const mocha = await new Mocha({ timeout: 12000000, parallel: false, color: true, noHighlighting: false })
            log.info('Mocha options', JSON.stringify(mocha.options, null, 2))

            files.forEach((file) => {
                mocha.addFile(file)
                log.info('Adding file: ', file)
            })

            const runner = mocha.run()

            runner.on('fail', (test, err) => {
                log.error('Test failed', test.title, err)
                reject(new ProsopoEnvError(err))
            })

            runner.on('end', () => {
                log.info(`All tests done. ${numberOfFailures} failures.`)
                if (numberOfFailures > 0) {
                    reject(new ProsopoEnvError(new Error(`Test run failed with ${numberOfFailures} failures.`)))
                }
                resolve(0)
            })
        } catch (err) {
            reject(err)
        }
    })
}

export async function runTests() {
    try {
        const log = logger(logLevel, 'TestRunner')
        const files = await findTestFiles(log)

        // Set config for tests
        ProsopoConfigSchema.parse(testConfig)
        process.env.config = JSON.stringify(testConfig)

        return await runMochaTests(files, log)
    } catch (err) {
        throw new Error(err)
    }
}
