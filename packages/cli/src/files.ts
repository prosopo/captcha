// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ProsopoCliError } from '@prosopo/common'
import { Readable } from 'stream'
import fs, { WriteStream, createWriteStream } from 'fs'

export function loadJSONFile(filePath: string) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
        throw new ProsopoCliError('GENERAL.JSON_LOAD_FAILED', { context: { error, filePath } })
    }
}

export function writeJSONFile(filePath: string, jsonData: Record<string, any>) {
    return new Promise((resolve, reject) => {
        const writeStream: WriteStream = createWriteStream(filePath)

        writeStream.setDefaultEncoding('utf-8')

        writeStream.on('finish', () => {
            resolve(true)
        })

        writeStream.on('error', (err) => {
            reject(err)
        })

        // https://stackoverflow.com/questions/64585940/writestream-nodejs-out-memory
        const readable = Readable.from(JSON.stringify(jsonData))

        readable.pipe(writeStream)
    })
}

export async function readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) reject(err)
            resolve(data as Buffer)
        })
    })
}
