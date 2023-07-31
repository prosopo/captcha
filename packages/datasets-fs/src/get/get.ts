import { Args } from './args'
import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import fetch from 'node-fetch'
import fs from 'fs'

export default async (args: Args, loggerOpt?: Logger) => {
    const logger = loggerOpt || getLoggerDefault()

    logger.debug(args, 'getting...')

    const traverse = async (data: JSON) => {
        if (data instanceof Array) {
            for (let i = 0; i < data.length; i++) {
                data[i] = await traverse(data[i])
            }
        } else if (data instanceof Object) {
            for (const key of Object.keys(data)) {
                if (key == 'data') {
                    const url = data[key]
                    if (url.startsWith('http')) {
                        try {
                            const response = await fetch(url)
                            if (!response.ok) {
                                logger.error(`GET ${url} ${response.status} ${response.statusText}`)
                            } else {
                                logger.log(`GET ${url} OK`)
                            }
                        } catch (err) {
                            logger.error(err)
                        }
                    } else {
                        // resolve locally
                        try {
                            fs.readFileSync(url)
                            logger.log(`GET ${url} OK`)
                        } catch (err) {
                            logger.error(`GET ${url} ${err}`)
                        }
                    }
                } else {
                    await traverse(data[key])
                }
            }
        }
        return data
    }

    const file = args.data
    if (!fs.existsSync(file)) {
        throw new ProsopoEnvError(new Error(`file does not exist: ${file}`), 'FS.FILE_NOT_FOUND')
    }

    // read the map file
    const data: JSON = JSON.parse(fs.readFileSync(file, 'utf8'))
    await traverse(data)
}
