// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { hexToU8a, isHex } from '@polkadot/util'
import fs, { WriteStream, createWriteStream } from 'fs'
import { arrayJoin } from '@prosopo/common'
import { Logger, ProsopoEnvError } from '@prosopo/common'
import { Captcha, CaptchaSolution } from '@prosopo/types'
import pl from 'nodejs-polars'

export function encodeStringAddress(address: string) {
    try {
        return encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address))
    } catch (error) {
        throw new ProsopoEnvError(error, 'CONTRACT.INVALID_ADDRESS', {}, address)
    }
}

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

export function shuffleArray<T>(array: T[]): T[] {
    for (let arrayIndex = array.length - 1; arrayIndex > 0; arrayIndex--) {
        const randIndex = Math.floor(Math.random() * (arrayIndex + 1))
        ;[array[arrayIndex], array[randIndex]] = [array[randIndex], array[arrayIndex]]
    }
    return array
}

type PromiseQueueRes<T> = {
    data?: T
    error?: Error
}[]

/**
 * Executes promises in order
 * @param array - array of promises
 * @returns PromiseQueueRes\<T\>
 */
export async function promiseQueue<T>(array: (() => Promise<T>)[]): Promise<PromiseQueueRes<T>> {
    const ret: PromiseQueueRes<T> = []

    await [...array, () => Promise.resolve(undefined)].reduce((promise, curr, i) => {
        return promise
            .then((res) => {
                // first iteration has no res (initial reduce result)
                if (res) {
                    ret.push({ data: res })
                }
                return curr() as any
            })
            .catch((err) => {
                ret.push({ data: err })
                return curr()
            })
    }, Promise.resolve<T | undefined>(undefined))

    return ret
}

export function parseBlockNumber(blockNumberString: string) {
    return parseInt(blockNumberString.replace(/,/g, ''))
}

export function calculateNewSolutions(solutions: CaptchaSolution[], winningNumberOfSolutions: number) {
    if (solutions.length === 0) {
        return pl.DataFrame([])
    }
    const solutionsNoEmptyArrays = solutions.map(({ solution, ...otherAttrs }) => {
        return { solutionKey: arrayJoin(solution, ','), ...otherAttrs }
    })
    let df = pl.readRecords(solutionsNoEmptyArrays)
    df = df.drop('salt')
    const group = df.groupBy(['captchaId', 'solutionKey']).agg(pl.count('captchaContentId').alias('count'))
    const filtered = group.filter(pl.col('count').gt(winningNumberOfSolutions))
    return filtered.withColumn(filtered['solutionKey'].str.split(',').rename('solution'))
}

export function updateSolutions(solutions: pl.DataFrame, captchas: Captcha[], logger: Logger): Captcha[] {
    // Note - loading the dataset in nodejs-polars doesn't work because of nested objects, which is why this is done in
    // a map instead of a join
    return captchas.map((captcha: Captcha) => {
        // try to find the solution in the solutions dataframe
        if (!captcha.solution) {
            try {
                const captchaSolutions = [
                    ...solutions.filter(pl.col('captchaId').eq(pl.lit(captcha.captchaId)))['solution'].values(),
                ]
                if (captchaSolutions.length > 0) {
                    captcha.solution = captchaSolutions[0]
                    captcha.solved = true
                }
            } catch {
                logger.debug('No solution found for captchaId', captcha.captchaId)
            }
        }
        return captcha
    })
}
