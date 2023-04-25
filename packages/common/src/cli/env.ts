import { Keyring } from '@polkadot/keyring'
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
import { hexToU8a, isHex } from '@polkadot/util'
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto'
import { KeypairType } from '@polkadot/util-crypto/types'
import { ProsopoEnvError } from '../error'
import { LogLevel, logger } from '../logger'

const log = logger(LogLevel.Info, 'Env setup')

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
