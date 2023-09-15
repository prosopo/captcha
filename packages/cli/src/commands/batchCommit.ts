import { ArgumentsCamelCase, Argv } from 'yargs'
import { BatchCommitmentsTask } from '@prosopo/provider'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { validateScheduleExpression } from './validators.js'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.batch_commit')
    return {
        command: 'batch_commit',
        describe: 'Batch commit user solutions to contract' as const,
        builder: (yargs: Argv) => {
            return yargs.option('schedule', {
                type: 'string' as const,
                demand: false,
                desc: 'A Recurring schedule expression',
            } as const)
        },
        handler: async (argv: ArgumentsCamelCase) => {
            const env = new ProviderEnvironment(pair, config)
            await env.isReady()
            if (argv.schedule) {
                throw new ProsopoEnvError('GENERAL.NOT_IMPLEMENTED')
            } else {
                if (env.db) {
                    const batchCommitter = new BatchCommitmentsTask(
                        env.config.batchCommit,
                        env.getContractInterface(),
                        env.db,
                        0n,
                        env.logger
                    )
                    const result = await batchCommitter.run()
                    logger.info(`Batch commit complete: ${result}`)
                } else {
                    logger.error('No database configured')
                }
            }
        },
        middlewares: [validateScheduleExpression],
    }
}
