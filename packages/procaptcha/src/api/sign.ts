import { Keyring } from '@polkadot/keyring'
import { blake2AsHex } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'

export function sign(message: string, account): { messageHash: string; signature: string } {
    const keyring = new Keyring({ type: 'ecdsa' })
    const pair = keyring.addFromUri('//Alice')
    const sig = pair.sign(message)

    const signature = u8aToHex(sig)

    const messageHash = blake2AsHex(message)

    return { messageHash, signature }
}
