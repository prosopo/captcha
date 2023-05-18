import { KeypairType } from '@polkadot/util-crypto/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import prosopoConfig from './prosopo.config'

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

export function getConfig(): ProsopoConfig {
    return prosopoConfig() as ProsopoConfig
}
