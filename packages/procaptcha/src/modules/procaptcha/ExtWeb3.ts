import { InjectedExtension } from '@polkadot/extension-inject/types'
import { web3Enable } from '@polkadot/extension-dapp'
import Ext from './Ext'
import { AccountNotFoundError, ExtensionNotFoundError } from './errors'
import { Account, ProcaptchaConfig } from './Manager'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb3 extends Ext {
    public async getAccount(config: ProcaptchaConfig): Promise<Account> {
        const { dappName, userAccountAddress: address } = config

        if (!address) {
            throw new AccountNotFoundError('No account address provided')
        }

        // enable access to all extensions
        const extensions: InjectedExtension[] = await web3Enable(dappName)
        if (extensions.length === 0) {
            throw new ExtensionNotFoundError()
        }

        // search through all extensions for the one that has the account
        for (const extension of extensions) {
            const accounts = await extension.accounts.get()
            const account = accounts.find((account) => account.address === address)
            if (account) {
                return { account, extension }
            }
        }

        throw new AccountNotFoundError('No account found matching ' + address)
    }
}
