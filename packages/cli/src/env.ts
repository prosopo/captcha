import { LogLevel, logger } from '@prosopo/common'
import { getEnv } from './process.env'
import dotenv from 'dotenv'
import path from 'path'

export function loadEnv(rootDir?: string, filename?: string, filePath?: string) {
    const envPath = getEnvFile(path.resolve(rootDir || '.'), filename, filePath)
    const args = { path: envPath }
    logger(LogLevel.Info, 'cli.env').info(`Env path:  ${envPath}`)
    dotenv.config(args)
}

export function getEnvFile(rootDir?: string, filename = '.env', filepath = path.join(__dirname, '../..')) {
    const log = logger(LogLevel.Info, 'cli.env')
    const env = getEnv()
    const envPath = path.join(rootDir || filepath, `${filename}.${env}`)
    log.info(`Env path: ${envPath}`)
    return envPath
}
