import { getEnv } from '../cli/env'
import { glob } from 'glob'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import consola from 'consola'

export async function findEnvFiles(logger: typeof consola) {
    const env = getEnv()
    const fileName = `.env.${env}`
    // options is optional
    logger.info('Searching for files')
    return await glob.glob(`../../**/${fileName}`, {
        ignore: [
            'node_modules/**',
            'node_modules/**',
            '../../**/node_modules/**',
            '../node_modules/**',
            '../../node_modules/**',
        ],
    })
}

export async function updateEnvFiles(varNames: string[], varValue: string, logger: typeof consola) {
    const files = await findEnvFiles(logger)
    logger.info('Env files found', files)
    files.forEach((file) => {
        let write = false
        // the following code loads a .env file, searches for the variable and replaces it
        // then saves the file
        const filePath = path.resolve(process.cwd(), file)
        const envConfig = dotenv.parse(fs.readFileSync(filePath))
        for (const varName of varNames) {
            if (varName in envConfig) {
                envConfig[varName] = varValue
                write = true
            }
        }
        if (write) {
            // write the file back
            fs.writeFileSync(
                path.resolve(__dirname, filePath),
                Object.keys(envConfig)
                    .map((k) => `${k}=${envConfig[k]}`)
                    .join('\n')
            )
        }
    })
}
