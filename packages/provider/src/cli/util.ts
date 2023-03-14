import { KeypairType } from '@polkadot/util-crypto/types'
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto'
import { Keyring } from '@polkadot/keyring'
import { hexToU8a, isHex } from '@polkadot/util'
import { ProsopoEnvError } from '@prosopo/common'

export function getSs58Format(): number {
    return parseInt(process.env.SS58_FORMAT || '') || 42
}

export function getPairType(): KeypairType {
    return (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType)
}

export async function getPair(
    pairType: KeypairType,
    ss58Format: number,
    mnemonic?: string,
    seed?: string,
    json?: KeyringPair$Json,
    uri?: string
): Promise<KeyringPair> {
    await cryptoWaitReady()
    const keyring = new Keyring({ type: pairType, ss58Format })
    if (mnemonic && mnemonicValidate(mnemonic)) {
        return keyring.addFromUri(mnemonic)
    }
    if (seed && isHex(seed)) {
        return keyring.addFromSeed(hexToU8a(seed))
    }
    if (json) {
        return keyring.addFromJson(json)
    }
    if (uri) {
        return keyring.addFromUri(uri)
    }
    throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
}
