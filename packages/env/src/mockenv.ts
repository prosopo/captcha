import { ProviderEnvironment } from './provider'
import { mnemonicGenerate } from '@polkadot/util-crypto'

export class MockEnvironment extends ProviderEnvironment {
    public createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        const account = this.keyring.addFromMnemonic(mnemonic)
        const { address } = account
        return [mnemonic, address]
    }
}
