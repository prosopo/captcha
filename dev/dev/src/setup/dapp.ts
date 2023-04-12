import { ProsopoEnvironment, Tasks } from '@prosopo/provider'
import { IDappAccount } from '../types/index'

export async function setupDapp(env: ProsopoEnvironment, dapp: IDappAccount): Promise<void> {
    const logger = env.logger
    if (dapp.pair) {
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)

        try {
            await tasks.contractApi.getDappDetails(dapp.contractAccount)
            logger.info('   - dapp is already registered')
        } catch (e) {
            logger.info('   - dappRegister')
            await tasks.contractApi.dappRegister(dapp.contractAccount, 'Dapp')
            logger.info('   - dappFund')
            await tasks.contractApi.dappFund(dapp.contractAccount, dapp.fundAmount)
        }
    }
}
