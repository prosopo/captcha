import { DatabaseTypes, EnvironmentTypes, ProsopoConfigSchema } from '@prosopo/types'
import { Logger, logger } from '@prosopo/common'
import { getLogLevel, loadEnv } from '@prosopo/cli'
import { glob } from 'glob'
require('ts-mocha')
import Mocha from 'mocha'
loadEnv()
const logLevel = getLogLevel()
const testConfig = {
    logLevel,
    contract: { abi: '../contract/src/abi/prosopo.json' }, // Deprecated for abiJson.
    defaultEnvironment: EnvironmentTypes.development,
    account: {
        password: '',
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
        development: { type: DatabaseTypes.mongoMemory, endpoint: '', dbname: 'prosopo', authSource: '' },
    },
    assets: {
        absolutePath: '',
        basePath: '',
    },
    server: {
        baseURL: 'http://localhost',
        port: 8282,
        fileServePaths: [],
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

            runner.on('end', () => {
                log.info('All tests done')
                if (numberOfFailures > 0) {
                    reject(new Error(`Test run failed with ${numberOfFailures} failures.`))
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
