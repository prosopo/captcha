import { Environment } from './env'
import { mnemonicGenerate } from '@polkadot/util-crypto'

export class MockEnvironment extends Environment {
    public createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        console.log('Before adding mnemonic to keyring')
        const account = this.keyring.addFromMnemonic(mnemonic)
        console.log('After adding mnemonic to keyring')
        const { address } = account
        return [mnemonic, address]
    }
}
