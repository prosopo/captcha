import { Account } from '../types'
import { ProcaptchaClientConfig } from '@prosopo/types'

/**
 * Class to interface with accounts.
 */
export default abstract class Extension {
    /**
     * Find an account given an address.
     * @param address the address of the account
     * @param dappName the name of the dapp wanting to gain access to accounts (e.g. "Prosopo")
     * @returns the account
     * @throws if the account is not found
     */
    public abstract getAccount(config: ProcaptchaClientConfig): Promise<Account>
}
