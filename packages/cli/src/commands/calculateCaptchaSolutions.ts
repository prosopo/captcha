import { Argv } from 'yargs'
import { CalculateSolutionsTask } from '@prosopo/provider'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { validateScheduleExpression } from './validators.js'
export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.calculate_captcha_solutions')

    return {
        command: 'calculate_captcha_solutions',
        describe: 'Calculate captcha solutions',
        builder: (yargs: Argv) => {
            return yargs.option('schedule', {
                type: 'string' as const,
                demand: false,
                desc: 'A Recurring schedule expression',
            } as const)
        },
        handler: async (argv) => {
            const env = new ProviderEnvironment(pair, config)
            await env.isReady()
            if (argv.schedule) {
                throw new ProsopoEnvError('GENERAL.NOT_IMPLEMENTED')
            } else {
                const calculateSolutionsTask = new CalculateSolutionsTask(env)
                const result = await calculateSolutionsTask.run()
                logger.info(`Updated ${result} captcha solutions`)
            }
        },
        middlewares: [validateScheduleExpression],
    }
}
