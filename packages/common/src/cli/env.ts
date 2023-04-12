import path from 'path'
import dotenv from 'dotenv'
import { ProsopoEnvError } from '../error'
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
import { Keyring } from '@polkadot/keyring'
import { KeypairType } from '@polkadot/util-crypto/types'
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto'
import { hexToU8a, isHex } from '@polkadot/util'
import { LogLevel, logger } from '../logger'

const log = logger(LogLevel.Info, 'Env setup')

export function loadEnv(rootDir?: string, filename?: string, path?: string) {
    const args = { path: getEnvFile(rootDir, filename, path) }
    dotenv.config(args)
}

export function getEnvFile(rootDir?: string, filename = '.env', filepath = path.join(__dirname, '../..')) {
    const env = getEnv()
    const envPath = path.join(rootDir || filepath, `${filename}.${env}`)
    log.info(`Env path: ${envPath}`)
    return envPath
}

export function getEnv() {
    return process.env.NODE_ENV || 'development'
}

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
