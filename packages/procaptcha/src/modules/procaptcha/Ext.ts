import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { Account, ProcaptchaConfig } from './Manager'
import { AccountCreationUnsupportedError } from './errors'

/**
 * Class to interface with accounts.
 */
export default abstract class Ext {
    /**
     * Find an account given an address.
     * @param address the address of the account
     * @param dappName the name of the dapp wanting to gain access to accounts (e.g. "Prosopo")
     * @returns the account
     * @throws if the account is not found
     */
    public abstract getAccount(config: ProcaptchaConfig): Promise<Account>

    public createAccount(): Promise<InjectedAccountWithMeta> {
        throw new AccountCreationUnsupportedError()
    }
}
