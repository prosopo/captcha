import { ProsopoEnvError } from '@prosopo/common'
import fs, { WriteStream, createWriteStream } from 'fs'

export function loadJSONFile(filePath: string, logger?: any) {
    // const parsedFilePath = handleFileProtocol(filePath, logger)
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (err) {
        throw new ProsopoEnvError(err, 'GENERAL.JSON_LOAD_FAILED', {}, filePath)
    }
}

export function writeJSONFile(filePath: string, jsonData) {
    return new Promise((resolve, reject) => {
        const writeStream: WriteStream = createWriteStream(filePath)

        writeStream.setDefaultEncoding('utf-8')

        writeStream.on('open', () => {
            writeStream.write(JSON.stringify(jsonData), (err) => {
                if (err) {
                    reject(err)
                }
                writeStream.end()
            })
        })

        writeStream.on('finish', () => {
            resolve(true)
        })

        writeStream.on('error', (err) => {
            reject(err)
        })
    })
}

export async function readFile(filePath): Promise<Buffer> {
    // const parsedFilePath = handleFileProtocol(filePath, undefined)
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) reject(err)
            resolve(data as Buffer)
        })
    })
}
