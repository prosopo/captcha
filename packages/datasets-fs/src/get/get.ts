import { Args } from './args'
import { ProsopoEnvError } from '@prosopo/common'
import { consola } from 'consola'
import fetch from 'node-fetch'
import fs from 'fs'

export default async (args: Args) => {
    consola.log(args, 'getting...')

    const file = args.data
    if (!fs.existsSync(file)) {
        throw new ProsopoEnvError(new Error(`file does not exist: ${file}`), 'FS.FILE_NOT_FOUND')
    }

    // read the map file
    const data: JSON = JSON.parse(fs.readFileSync(file, 'utf8'))
    await traverse(data)
}

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
                            consola.error(`GET ${url} ${response.status} ${response.statusText}`)
                        } else {
                            consola.log(`GET ${url} OK`)
                        }
                    } catch (err) {
                        consola.error(err)
                    }
                } else {
                    // resolve locally
                    try {
                        fs.readFileSync(url)
                        consola.log(`GET ${url} OK`)
                    } catch (err) {
                        consola.error(`GET ${url} ${err}`)
                    }
                }
            } else {
                await traverse(data[key])
            }
        }
    }
    return data
}
