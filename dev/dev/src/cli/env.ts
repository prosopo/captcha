import path from 'path'
import dotenv from 'dotenv'

export function loadEnv() {
    const args = { path: getEnvFile() }
    dotenv.config(args)
}

export function getEnvFile(filename = '.env', filepath = path.join(__dirname, '../..')) {
    const env = getEnv()
    return path.join(filepath, `${filename}.${env}`)
}

export function getEnv() {
    return process.env.NODE_ENV || 'development'
}
