import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { DappPayee, ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { get } from '@prosopo/util'
import { validateContract, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
import { z } from 'zod'
import { ArgumentsCamelCase, Argv } from 'yargs'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_update')

    return {
        command: 'dapp_update',
        describe: 'Register a Dapp',
        builder: (yargs: Argv) =>
            yargs
                .option('contract', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The AccountId of the Dapp',
                } as const)
                .option('payee', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
                const stakeThreshold = (await tasks.contract.query.getDappStakeThreshold({})).value.unwrap()
                const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappUpdate> = [
                    z.string().parse(argv.contract),
                    get(DappPayee, z.string().parse(argv.payee)),
                    z.string().parse(argv.owner),
                    {
                        value: stakeThreshold.toNumber(),
                    },
                ]
                await wrapQuery(tasks.contract.query.dappUpdate, tasks.contract.query)(...dappRegisterArgs)
                const result = await tasks.contract.tx.dappUpdate(...dappRegisterArgs)

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateContract, validatePayee],
    }
}
