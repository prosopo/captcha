// Create a user of specified type using the databasePopulator
import { ProsopoEnvironment } from '../../src/index'
import { AccountKey, IDatabaseAccounts } from '../dataUtils/DatabaseAccounts'
import { populateDatabase, userFundMapDefault } from '../dataUtils/populateDatabase'
import { ProsopoEnvError } from '@prosopo/common'
import { Account } from './accounts'
import { DappAbiJSON, DappWasm } from '../dataUtils/dapp-example-contract/loadFiles'

export async function getUser(env: ProsopoEnvironment, accountType: AccountKey, fund = true): Promise<Account> {
    const accountConfig = Object.assign({}, ...Object.keys(AccountKey).map((item) => ({ [item]: 0 })))
    accountConfig[accountType] = 1
    const dappWasm = await DappWasm()
    const dappAbiJSON = await DappAbiJSON()
    const databaseAccounts: IDatabaseAccounts = await populateDatabase(
        env,
        accountConfig,
        { ...userFundMapDefault, [accountType]: fund },
        false,
        dappAbiJSON,
        dappWasm
    )
    const account = databaseAccounts[accountType].pop()
    if (account === undefined) {
        throw new ProsopoEnvError(new Error(`${accountType} not created by databasePopulator`))
    }
    return account
}
