import { KeypairType } from '@polkadot/util-crypto/types'
import { LogLevel, ProsopoEnvError, logger } from '@prosopo/common'
import dotenv from 'dotenv'
import path from 'path'

const log = logger(LogLevel.Info, 'Env setup')

export function loadEnv(rootDir?: string, filename?: string, filePath?: string) {
    const args = { path: getEnvFile(path.resolve(rootDir || '.'), filename, filePath) }
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
