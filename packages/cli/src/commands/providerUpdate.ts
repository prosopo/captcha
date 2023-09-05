import { Logger, UrlConverter } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { validateAddress, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
import { ArgumentsCamelCase, Argv } from 'yargs'
import { z } from 'zod'
import { Payee } from '@prosopo/types'
import { get } from '@prosopo/util'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'provider_update',
        description: 'Update a Provider',
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
            const {
                address,
                urlStr,
                fee,
                payeeStr,
                value,
            } = z.object({
                address: z.string(),
                urlStr: z.string().optional(),
                fee: z.number().optional(),
                payeeStr: z.string().optional(),
                value: z.number().optional(),
            }).parse(argv)
            const provider = (await tasks.contract.query.getProvider(address, {})).value.unwrap().unwrap()
            const payee: Payee = payeeStr ? get(Payee, payeeStr) : provider.payee
            const url = urlStr ? Array.from(new UrlConverter().encode(urlStr)) : provider.url
            if (provider && (argv.url || argv.fee || argv.payee || argv.value)) {
                await wrapQuery(tasks.contract.query.providerUpdate, tasks.contract.query)(
                    url,
                    fee || provider.fee,
                    payee || provider.payee,
                    { value: value || 0 }
                )
                const result = await tasks.contract.tx.providerUpdate(
                    url || provider.url,
                    fee || provider.fee,
                    payee || provider.payee,
                    { value: value || 0 }
                )

                logger.info(JSON.stringify(result, null, 2))
            }
        },
        middlewares: [validateAddress, validatePayee],
    }
}
