import { WsProvider } from '@polkadot/rpc-provider'
import Ext from './Ext'
import { Account, ProcaptchaConfig } from './Manager'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb3 extends Ext {
    public async getAccount(config: ProcaptchaConfig): Promise<Account> {
        const wsProvider = new WsProvider(config.dappUrl)
        const canvasConfig = {
            area: { width: 300, height: 300 },
            offsetParameter: 2001000001,
            multiplier: 15000,
            fontSizeFactor: 1.5,
            maxShadowBlur: 50,
            numberOfRounds: 5,
            seed: 42,
        }
        throw new Error('unsupported')
    }
}
