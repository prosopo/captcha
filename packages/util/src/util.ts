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
// sleep for some milliseconds
import { u8aToHex } from '@polkadot/util'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// create a generator that yields the permutations for a set of options
// E.g. say we have 3 chars which can take 2 values each ('a' or 'b'), then we have 2^3 = 8 permutations:
//     a a a
//     a a b
//     a b a
//     a b b
//     b a a
//     b a b
//     b b a
//     b b b
// This function yields each permutation as an array of numbers, where each number is the index of the option for that position
// E.g. for the above example, the first permutation is [0, 0, 0], the second is [0, 0, 1], the third is [0, 1, 0], etc.
//
// The bins param is an array of numbers, where each number is the number of options for that position
// E.g. for the above example, the bins param would be [2, 2, 2]
//
// Note that the bins can be differing sizes, so the first char could have 2 options whereas the second could have 3 options and the fourth char could have 6 options
//
// Optionally include the empty permutation, i.e. [] (useful for when you want to include the empty permutation in a cartesian product)
export function* permutations(
    bins: number[],
    options?: {
        includeEmpty?: boolean
    }
): Generator<number[]> {
    if (options?.includeEmpty) {
        yield []
    }
    if (bins.length === 0) {
        return
    }
    const arr = Array.from({ length: bins.length }, () => 0)
    let i = arr.length - 1
    while (true) {
        yield [...arr]
        arr[i]++
        while (arr[i] === bins[i]) {
            arr[i] = 0
            i--
            if (i < 0) {
                return
            }
            arr[i]++
        }
        i = arr.length - 1
    }
}

export function get<T>(obj: T, key: unknown, required?: true): Exclude<T[keyof T], undefined>
export function get<T>(obj: T, key: unknown, required: false): T[keyof T] | undefined
export function get<T>(obj: unknown, key: string | number | symbol, required?: true): Exclude<T, undefined>
export function get<T>(obj: unknown, key: string | number | symbol, required: false): T | undefined
export function get<T, V>(obj: T, key: unknown, required = true): V {
    const value = obj[key as unknown as keyof T]
    if (required && value === undefined) {
        throw new Error(`Object has no property '${String(key)}': ${JSON.stringify(obj, null, 2)}`)
    }
    return value as V
}

export type AtOptions = {
    optional?: boolean // whether to allow undefined elements in the array (true == optional, false == mandatory)
    noWrap?: boolean // whether to wrap the index around the bounds of the array (true == no wrap, false == wrap indices)
}
// Get an element from an array, throwing an error if it's index is out of bounds or if the element is undefined or null (can be overridden with the options)
export function at(str: string, index: number, options: AtOptions & { optional: true }): string | undefined
export function at(str: string, index: number, options?: AtOptions): string
export function at<T>(items: T[] | string, index: number, options: AtOptions & { optional: false }): T
export function at<T>(
    items: (T | undefined)[] | string,
    index: number,
    options: AtOptions & { optional: true }
): T | undefined
export function at<T>(items: T[], index: number, options?: AtOptions): T
export function at<T>(items: T[] | string, index: number, options?: AtOptions): T {
    if (items.length === 0) {
        throw new Error('Array is empty')
    }

    if (!options?.noWrap) {
        if (index > 0) {
            index = index % items.length
        } else {
            // negative index, so index wraps in reverse
            // e.g. say the index is -25 and the items length is 10
            // ceil(25 / 10) = 3 * 10 = 30 + -25 = 5
            index = Math.ceil(Math.abs(index) / items.length) * items.length + index
        }
    }

    if (index >= items.length) {
        throw new Error(`Index ${index} larger than array length ${items.length}`)
    }
    if (index < 0) {
        throw new Error(`Index ${index} smaller than 0`)
    }

    return items[index] as unknown as T
}

type ChoiceOptions = {
    withReplacement?: boolean
}
function choice<T>(items: T[], n: number, random: () => number, options?: ChoiceOptions): T[] {
    if (n > items.length) {
        throw new Error(`Cannot choose ${n} items from array of length ${items.length}`)
    }

    const result: T[] = []
    const indices: number[] = []
    for (let i = 0; i < n; i++) {
        let index: number
        do {
            index = Math.floor(Math.abs(random()) * items.length) % items.length
        } while (options?.withReplacement === false && indices.includes(index))
        indices.push(index)
        result.push(items[index] as T)
    }
    return result
}

export function getCurrentFileDirectory(url: string) {
    return new URL(url).pathname.split('/').slice(0, -1).join('/')
}

export const flattenObj = (obj: object, prefix = ''): Record<string, unknown> => {
    const flattenedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Object) {
            Object.assign(flattenedObj, flattenObj(value, `${prefix}.${key}`))
        } else {
            flattenedObj[`${prefix}.${key}`] = value
        }
    }
    return flattenedObj
}

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
export const kebabCase = (str: string) =>
    str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())

export type MergeOptions = {
    atomicArrays?: boolean
}

// Merge two objects or arrays together.
// Nesting can be infinitely deep.
// Arrays can be homogeneous or hetrogeneous.
// The destination object/array is mutated directly.
// Arrays can be merged in two ways:
// - update (default): replace elements as required and extend array as required, e.g. [1,2,3] + [4,5] = [4,5,3]
// - replace: treat the array as a primitive value and simply replace as-is, e.g. [1,2,3] + [4,5] = [4,5]
// The 'atomicArrays' option controls whether arrays are treated as primitives or not. E.g. atomicArrays=true is the 'replace' strategy, atomicArrays=false is the 'update' strategy.
// This method treats arrays as an object with numeric keys and merged using the object merge strategy.
export function merge<T extends object | A[], U extends object | B[], A, B>(
    dest: T,
    src: U,
    options?: MergeOptions
): T & U {
    const atomicArrays = options?.atomicArrays
    // maintain a queue of object sources/destinations to merge
    const queue: {
        src: unknown
        dest: unknown
    }[] = [
        {
            src,
            dest,
        },
    ]
    while (queue.length > 0) {
        const task = queue.pop()
        if (task === undefined) {
            throw new Error('queue is empty')
        }
        if (isArray(task.dest)) {
            // handling arrays
            const src = task.src as unknown[]
            const dest = task.dest as unknown[]
            if (atomicArrays) {
                // delete any items beyond the length of src
                while (dest.length > src.length) {
                    dest.pop()
                }
                // treat arrays as primitives / atomic
                for (let i = 0; i < src.length; i++) {
                    dest[i] = src[i]
                }
            } else {
                // else not treating arrays as primitives / atomic
                // so need to merge them
                // copy the elements from src into dest
                for (let i = 0; i < src.length; i++) {
                    // if the element is an array or object, then we need to merge it
                    if ((isArray(dest[i]) && isArray(src[i])) || (isObject(dest[i]) && isObject(src[i]))) {
                        // need to merge arrays or objects
                        queue.push({
                            src: src[i],
                            dest: dest[i],
                        })
                    } else {
                        // primitive, so replace
                        // or src[i] is array but dest[i] is not, so replace
                        // or src[i] is object but dest[i] is not, so replace
                        dest[i] = src[i]
                    }
                }
            }
        } else if (isObject(task.dest)) {
            const src = task.src as object
            const destAny = task.dest as any
            // for every entry in src
            for (const [key, value] of Object.entries(src)) {
                // if the value in src + dest is an array or object, then we need to merge it
                if ((isArray(value) && isArray(destAny[key])) || (isObject(value) && isObject(destAny[key]))) {
                    // need to merge arrays or objects
                    queue.push({
                        src: value,
                        dest: destAny[key],
                    })
                } else {
                    // primitive, so replace
                    // or value is array but dest[key] is not, so replace
                    // or value is object but dest[key] is not, so replace
                    destAny[key] = value
                }
            }
        } else {
            throw new Error(`cannot handle type in queue: ${typeof task.dest}`)
        }
    }

    return dest as T & U
}

export const isArray = (value: unknown): boolean => {
    return Array.isArray(value)
}

export const isObject = (value: unknown): boolean => {
    return value instanceof Object && !isArray(value)
}

export type Hash = string | number[]

export const hashToHex = (hash: Hash) => {
    if (isArray(hash)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return u8aToHex(new Uint8Array(hash))
    }
    return hash.toString()
}
