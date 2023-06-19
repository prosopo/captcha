import { Tasks } from '@prosopo/provider'
import { IDappAccount } from '@prosopo/types'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { DappPayee } from '@prosopo/types/dist/contract/typechain/captcha/types-arguments/captcha'

export async function setupDapp(env: ProsopoEnvironment, dapp: IDappAccount): Promise<void> {
    const logger = env.logger
    if (dapp.pair) {
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)

        try {
            ;(await tasks.contract.query.getDapp(dapp.contractAccount)).value.unwrap().unwrap()
            logger.info('   - dapp is already registered')
        } catch (e) {
            logger.info('   - dappRegister')
            await tasks.contract.tx.dappRegister(dapp.contractAccount, DappPayee.dapp)
            logger.info('   - dappFund')
            await tasks.contract.tx.dappFund(dapp.contractAccount, { value: dapp.fundAmount })
        }
    }
}
