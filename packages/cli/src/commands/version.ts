import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.version')

    return {
        command: 'version',
        describe: 'Return the version of the software',
        handler: async () => {
            const version = JSON.stringify(process.env.PROSOPO_PACKAGE_VERSION) || 'dev'
            logger.info(`Version: ${version}`)
        },
    }
}
