import { DatabaseTypes, EnvironmentTypesSchema } from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

const logLevel = getLogLevel()
export default {
    logLevel,
    contract: { abi: '../contract/src/abi/prosopo.json' }, // Deprecated for abiJson.
    defaultEnvironment: EnvironmentTypesSchema.Values.development,
    account: {
        password: '',
        address: '',
    },
    networks: {
        development: {
            endpoint: process.env.SUBSTRATE_NODE_URL || 'ws://localhost:9944',
            contract: {
                address: process.env.PROTOCOL_CONTRACT_ADDRESS || '',
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
