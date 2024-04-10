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
import { Database } from '@prosopo/types-database'
import { ProsopoContractError } from '@prosopo/common'
import { ScheduledTaskNames, ScheduledTaskStatus } from '@prosopo/types'
import { at } from '@prosopo/util'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto/address'
import { hexToU8a } from '@polkadot/util/hex'
import { isHex } from '@polkadot/util/is'

export function encodeStringAddress(address: string) {
    try {
        return encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address))
    } catch (err) {
        throw new ProsopoContractError('CONTRACT.INVALID_ADDRESS', { context: { address } })
    }
}

export function shuffleArray<T>(array: T[]): T[] {
    for (let arrayIndex = array.length - 1; arrayIndex > 0; arrayIndex--) {
        const randIndex = Math.floor(Math.random() * (arrayIndex + 1))
        const tmp = at(array, randIndex)
        array[randIndex] = at(array, arrayIndex)
        array[arrayIndex] = tmp
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

/**
 * Check if there is a batch running.
 * If the batch task is running and not completed, return true.
 * If the batch task is running and completed, return false.
 * Otherwise, the batch task is not running, return false.
 */
export async function checkIfTaskIsRunning(taskName: ScheduledTaskNames, db: Database): Promise<boolean> {
    const runningTask = await db.getLastScheduledTaskStatus(taskName, ScheduledTaskStatus.Running)
    if (runningTask) {
        const completedTask = await db.getScheduledTaskStatus(runningTask.taskId, ScheduledTaskStatus.Completed)
        return !completedTask
    }
    return false
}
