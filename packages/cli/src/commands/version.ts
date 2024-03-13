import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import type { ProsopoConfigOutput } from '@prosopo/types'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.version')

    return {
        command: 'version',
        describe: 'Return the version of the software',
        handler: async () => {
            const version = JSON.stringify(process.env.PROSOPO_PACKAGE_VERSION) || 'dev'
            logger.info(`Version: ${version}`)
        },
    }
}
