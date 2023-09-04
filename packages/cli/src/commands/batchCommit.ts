import { Argv } from 'yargs'
import { BatchCommitmentsTask } from '@prosopo/provider'
import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { cwd } from 'process'
import { validateScheduleExpression } from './validators.js'
import pm2 from 'pm2'
import { ArgumentsCamelCase, Argv } from 'yargs'

export default (env: ProviderEnvironment, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger
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
            if (argv.schedule) {
                pm2.connect((err) => {
                    if (err) {
                        console.error(err)
                        process.exit(2)
                    }

                    pm2.start(
                        {
                            script: `ts-node scheduler.js ${JSON.stringify(argv.schedule)}`,
                            name: 'scheduler',
                            cwd: cwd() + '/dist/src',
                        },
                        (err, apps) => {
                            if (err) {
                                console.error(err)

                                return pm2.disconnect()
                            }

                            logger.info(apps)
                            process.exit()
                        }
                    )
                })
            } else {
                if (env.db) {
                    const batchCommitter = new BatchCommitmentsTask(
                        env.config.batchCommit,
                        env.contractInterface,
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
