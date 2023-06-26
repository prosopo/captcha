import { Account } from '../types'
import { AccountNotFoundError, ExtensionNotFoundError } from './errors'
import { InjectedExtension } from '@polkadot/extension-inject/types'
import { ProcaptchaClientConfig } from '@prosopo/types'
import { web3Enable } from '@polkadot/extension-dapp'
import Extension from './Extension'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb3 extends Extension {
    public async getAccount(config: ProcaptchaClientConfig): Promise<Account> {
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
