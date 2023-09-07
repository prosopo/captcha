import { ArgumentsCamelCase, Argv } from 'yargs'
import { CalculateSolutionsTask } from '@prosopo/provider'
import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { cwd } from 'process'
import { validateScheduleExpression } from './validators.js'
import pm2 from 'pm2'

export default (env: ProviderEnvironment, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'calculate_captcha_solutions',
        description: 'Calculate captcha solutions',
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
                const calculateSolutionsTask = new CalculateSolutionsTask(env)
                const result = await calculateSolutionsTask.run()
                logger.info(`Updated ${result} captcha solutions`)
            }
        },
        middlewares: [validateScheduleExpression],
    }
}
