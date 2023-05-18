import { LogLevel, Logger, logger } from '@prosopo/common'
import { DatabaseTypes, EnvironmentTypes, ProsopoConfigSchema } from '@prosopo/types'
import { loadEnv } from '@prosopo/cli'
import { glob } from 'glob'
require('ts-mocha')
const Mocha = require('mocha')
loadEnv()

const testConfig = {
    logLevel: LogLevel.Debug,
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

const mochaConfig = {
    // Specify "require" for CommonJS
    require: 'ts-node/register',
    // Specify "loader" for native ESM
    loader: 'ts-node/esm',
    extensions: ['ts', 'tsx'],
    spec: ['tests/**/*.test.*'],
    'watch-files': ['src'],
    timeout: 12000000,
}

async function runMochaTests(files, log) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        try {
            const numberOfFailures = 0
            const mocha = await new Mocha()
            mocha.config = mochaConfig
            files.forEach((file) => {
                mocha.addFile(file)
                log.info('Adding file: ', file)
            })

            mocha.parallelMode(false)

            const runner = mocha.run()

            runner.on('end', () => {
                log.info('All tests done')
                resolve(numberOfFailures)
            })
        } catch (err) {
            reject(err)
        }
    })
}

export async function runTests() {
    try {
        const log = logger(
            process.env.LOG_LEVEL ? (process.env.LOG_LEVEL as unknown as LogLevel) : LogLevel.Debug,
            'TestRunner'
        )
        const files = await findTestFiles(log)

        // Set config for tests
        ProsopoConfigSchema.parse(testConfig)
        process.env.config = JSON.stringify(testConfig)
        process.env.testTimeout = '12000000' // 20 minutes

        return await runMochaTests(files, log)
    } catch (err) {
        throw new Error(err)
    }
}
