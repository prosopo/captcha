// Create a user of specified type using the databasePopulator
import { Account } from './accounts'
import { AccountKey, IDatabaseAccounts } from './dataUtils/DatabaseAccounts'
import { DappAbiJSON, DappWasm } from './dataUtils/dapp-example-contract/loadFiles'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { populateDatabase, userFundMapDefault } from './dataUtils/populateDatabase'

export async function getUser(env: ProsopoEnvironment, accountType: AccountKey, fund = true): Promise<Account> {
    const accountConfig = Object.assign({}, ...Object.keys(AccountKey).map((item) => ({ [item]: 0 })))
    accountConfig[accountType] = 1
    const dappWasm = await DappWasm()
    const dappAbiJSON = await DappAbiJSON()
    const fundMap = { ...userFundMapDefault, [accountType]: fund }
    const databaseAccounts: IDatabaseAccounts = await populateDatabase(
        env,
        accountConfig,
        fundMap,
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
