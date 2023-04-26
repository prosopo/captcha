import { Keyring } from '@polkadot/keyring'
import { KeypairType } from '@polkadot/util-crypto/types'
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto'

/** Generate a mnemonic, returning the mnemonic and associated address
 * @param keyring
 * @param pairType
 */
export async function generateMnemonic(keyring?: Keyring, pairType?: KeypairType): Promise<[string, string]> {
    if (!keyring) {
        keyring = new Keyring({ type: pairType || 'sr25519' })
    }
    await cryptoWaitReady()
    const mnemonic = mnemonicGenerate()
    const account = keyring.addFromMnemonic(mnemonic)
    return [mnemonic, account.address]
}
