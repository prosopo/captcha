import { Args } from './args.js'
import { Logger, getLoggerDefault } from '@prosopo/common'
import fs from 'fs'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()
    logger.debug(args, 'relocating...')

    const replace = (data: unknown, from: string, to: string) => {
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                data[i] = replace(data[i], from, to)
            }
        } else if (typeof data === 'object') {
            const obj = data as object
            for (const key of Object.keys(obj)) {
                if (key === 'data') {
                    const value = obj[key]
                    if (value.startsWith(from)) {
                        obj[key] = to + value.slice(from.length)
                    }
                } else {
                    obj[key] = replace(obj[key], from, to)
                }
            }
        }
        return data
    }

    const file: string = args.data
    logger.log(`relocating data in ${file} from ${args.from} to ${args.to}`)
    // read the file
    let data = JSON.parse(fs.readFileSync(file, 'utf8'))
    // replace the urls by recursively traversing the data
    data = replace(data, args.from, args.to)
    // write the file
    fs.writeFileSync(file, JSON.stringify(data, null, 4))
}
