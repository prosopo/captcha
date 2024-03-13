import type { KeyringPair } from '@polkadot/keyring/types'
import {
    LogLevel,
    type Logger,
    ProsopoEnvError,
    getLogger,
} from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { CalculateSolutionsTask } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import type { ArgumentsCamelCase, Argv } from 'yargs'
import { validateScheduleExpression } from './validators.js'

export default (
    pair: KeyringPair,
    config: ProsopoConfigOutput,
    cmdArgs?: { logger?: Logger }
) => {
    const logger =
        cmdArgs?.logger ||
        getLogger(LogLevel.enum.info, 'cli.calculate_captcha_solutions')

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
        handler: async (argv: ArgumentsCamelCase) => {
            const env = new ProviderEnvironment(config, pair)
            await env.isReady()
            if (argv.schedule) {
                throw new ProsopoEnvError('GENERAL.NOT_IMPLEMENTED')
            }
            const calculateSolutionsTask = new CalculateSolutionsTask(env)
            const result = await calculateSolutionsTask.run()
            logger.info(`Updated ${result} captcha solutions`)
        },
        middlewares: [validateScheduleExpression],
    }
}
