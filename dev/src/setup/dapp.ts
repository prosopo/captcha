import { Dapp, IDappAccount } from '@prosopo/types'
import { DappPayee } from '@prosopo/types/dist/contract/typechain/captcha/types-arguments/captcha'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { wrapQuery } from '@prosopo/contract'

export async function setupDapp(env: ProsopoEnvironment, dapp: IDappAccount): Promise<void> {
    const logger = env.logger
    if (dapp.pair) {
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)

        try {
            const dappResult: Dapp = await wrapQuery(
                tasks.contract.query.getDapp,
                tasks.contract.query
            )(dapp.contractAccount)
            logger.info('   - dapp is already registered')
            logger.info('Dapp', dappResult)
        } catch (e) {
            logger.info('   - dappRegister')
            await tasks.contract.tx.dappRegister(dapp.contractAccount, DappPayee.dapp)
            logger.info('   - dappFund')
            await tasks.contract.tx.dappFund(dapp.contractAccount, { value: dapp.fundAmount })
        }
    }
}
