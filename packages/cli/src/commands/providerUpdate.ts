import { ArgumentsCamelCase, Argv } from 'yargs'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, UrlConverter, getLogger } from '@prosopo/common'
import { Payee } from '@prosopo/captcha-contract'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { validateAddress, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
import { z } from 'zod'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.provider_update')

    return {
        command: 'provider_update',
        describe: 'Update a Provider',
        builder: (yargs: Argv) =>
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
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                const { url, fee, payee, value, address } = z
                    .object({
                        url: z.string().optional(),
                        fee: z.number().optional(),
                        payee: z.nativeEnum(Payee).optional(),
                        value: z.number().optional(),
                        address: z.string(),
                    })
                    .parse(argv)
                const provider = (await tasks.contract.query.getProvider(address, {})).value.unwrap().unwrap()
                if (provider && (url || fee || payee || value)) {
                    const urlConverted = url ? Array.from(new UrlConverter().encode(url.toString())) : provider.url
                    await wrapQuery(tasks.contract.query.providerUpdate, tasks.contract.query)(
                        urlConverted,
                        fee || provider.fee,
                        payee || provider.payee,
                        { value: value || 0 }
                    )
                    const result = await tasks.contract.tx.providerUpdate(
                        urlConverted,
                        fee || provider.fee,
                        payee || provider.payee,
                        { value: value || 0 }
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
