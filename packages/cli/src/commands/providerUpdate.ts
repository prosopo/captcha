import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { validateAddress, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.provider_update')

    return {
        command: 'provider_update',
        describe: 'Update a Provider',
        builder: (yargs) =>
            yargs
                .option('url', {
                    type: 'string' as const,
                    demand: false,
                    desc: 'The provider service origin (URI)',
                } as const)
                .option('fee', {
                    type: 'number',
                    demand: false,
                    desc: 'The fee to pay per solved captcha',
                } as const)
                .option('payee', {
                    type: 'string' as const,
                    demand: false,
                    desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                } as const)
                .option('value', {
                    type: 'number',
                    demand: false,
                    desc: 'The value to stake in the contract',
                } as const),
        handler: async (argv) => {
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
                const provider = (await tasks.contract.query.getProvider(argv.address, {})).value.unwrap().unwrap()
                if (provider && (argv.url || argv.fee || argv.payee || argv.value)) {
                    await wrapQuery(tasks.contract.query.providerUpdate, tasks.contract.query)(
                        argv.url ? argv.url.toString() : provider.url,
                        argv.fee || provider.fee,
                        argv.payee || provider.payee,
                        { value: argv.value || 0 }
                    )
                    const result = await tasks.contract.tx.providerUpdate(
                        argv.url || provider.url,
                        argv.fee || provider.fee,
                        argv.payee || provider.payee,
                        { value: argv.value || 0 }
                    )

                    logger.info(JSON.stringify(result, null, 2))
                }
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateAddress, validatePayee],
    }
}
