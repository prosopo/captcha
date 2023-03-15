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

export function getSecret(): string {
    const secret =
        process.env.PROVIDER_MNEMONIC ||
        process.env.PROVIDER_SEED ||
        process.env.PROVIDER_URI ||
        process.env.PROVIDER_JSON
    if (!secret) {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
    return secret
}

export async function getPair(pairType: KeypairType, ss58Format: number, secret: string): Promise<KeyringPair> {
    await cryptoWaitReady()
    const keyring = new Keyring({ type: pairType, ss58Format })
    if (mnemonicValidate(secret)) {
        return keyring.addFromUri(secret)
    }
    if (isHex(secret)) {
        return keyring.addFromSeed(hexToU8a(secret))
    }
    if (secret.startsWith('//')) {
        return keyring.addFromUri(secret)
    }
    try {
        const json = JSON.parse(secret)
        const {
            encoding: { content },
        } = json
        const keyring = new Keyring({ type: content[1], ss58Format })
        return keyring.addFromJson(json as KeyringPair$Json)
    } catch (e) {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
}
