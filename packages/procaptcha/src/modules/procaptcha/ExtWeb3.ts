import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { web3Enable } from '@polkadot/extension-dapp'
import Ext from './Ext'
import { NoAccountFoundError } from './errors'
import { ProcaptchaConfig } from './Manager'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb3 extends Ext {
    public async getAccount(config: ProcaptchaConfig): Promise<InjectedAccount> {
        const { dappName, userAccountAddress: address } = config

        // enable access to all extensions
        const extensions: InjectedExtension[] = await web3Enable(dappName)

        // search through all extensions for the one that has the account
        for (const extension of extensions) {
            const accounts = await extension.accounts.get()
            const account = accounts.find((account) => account.address === address)
            if (account) {
                return account
            }
        }

        throw new NoAccountFoundError('No account found matching ' + address)
    }
}
