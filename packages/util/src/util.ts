import _lodash from 'lodash'
import seedrandom from 'seedrandom'

// set the seed for the global rng, i.e. seed `Math.random()`
export const setSeedGlobal = (seed: number | string) => {
    seedrandom(seed.toString(), { global: true })
}

// create a new lodash instance with the current Math.random() and other global state
export const lodash = () => {
    return _lodash.runInContext()
}

// create a new lodash instance with the given seed
export const seedLodash = (seed: number | string) => {
    // take a snapshot of the current Math.random() fn
    const orig = Math.random
    // replace Math.random with the seeded random
    seedrandom(seed.toString(), { global: true })
    // runInContext() creates a new lodash instance using the seeded Math.random()
    // the context is a snapshot of the state of the global javascript environment, i.e. Math.random() updated to the seedrandom instance
    const lodash = _lodash.runInContext()
    // restore the original Math.random() fn
    Math.random = orig
    // return the lodash instance with the seeded Math.random()
    return lodash
}

// create a new rng with the given seed
export const rng = (seed: number | string) => {
    const rng = seedrandom(seed.toString())
    return {
        double: () => rng.double(),
        float: () => rng.quick(),
        int: () => {
            // js only has 53 bits of precision for integers, so we can't use the full 64 bits of the rng
            // take two 32 bit integers and combine them into a 53 bit integer
            const a = rng.int32()
            const b = rng.int32()
            return (a << 21) + b
        },
        int32: () => rng.int32(),
        bool: () => rng.int32() % 2 === 0,
    }
}

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

// Get an element from an array, throwing an error if it's index is out of bounds or if the element is undefined or null
// Note undefined's are not allowed due to arrays returning undefined when accessing an out of bounds index
export type AtOptions = {
    optional?: boolean // whether to allow undefined elements in the array (true == optional, false == mandatory)
    noBoundsCheck?: boolean // whether to check the index against the bounds of the array (true == no bounds check, false == bounds check)
    noWrap?: boolean // whether to wrap the index around the bounds of the array (true == no wrap, false == wrap indices)
}
export function at(
    str: string,
    i: number,
    options: {
        optional: true
        noBoundsCheck?: boolean
        noWrap?: boolean
    }
): string | undefined
export function at(str: string, i: number, options?: AtOptions): string
export function at<T>(arr: T[], i: number, options?: AtOptions): T
export function at<T>(arr: T[] | string, i: number, options?: AtOptions): T | undefined {
    if (!options?.noWrap) {
        if (arr.length !== 0) {
            i %= arr.length
        }
        if (i < 0) {
            i += arr.length
        }
    }
    if (!options?.noBoundsCheck) {
        if (i >= arr.length || i < 0) {
            throw new Error(
                `Array index ${i} is out of bounds for array of length ${arr.length}: ${JSON.stringify(arr, null, 2)}`
            )
        }
    }
    const el = arr[i]
    if (!options?.optional && el === undefined) {
        throw new Error(
            `Array item at index ${i} is undefined for array of length ${arr.length}: ${JSON.stringify(arr, null, 2)}`
        )
    }
    return el as T
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

export const choice = <T>(
    items: T[],
    n: number,
    random: () => number,
    options?: {
        withReplacement?: boolean
    }
): {
    choices: T[]
    indices: number[]
} => {
    if (n > items.length) {
        throw new Error(`n (${n}) cannot be greater than items.length (${items.length})`)
    }
    options = options || {}

    const indicesSet = new Set<number>()
    const indices: number[] = []
    const choices: T[] = []
    while (indices.length < n) {
        const index = Math.abs(Math.round(random())) % items.length
        // with replacement == allow duplicates
        // without replacement == don't allow duplicates
        if (options.withReplacement || indicesSet.add(index)) {
            indices.push(index)
            choices.push(at(items, index, { optional: true }))
        }
    }

    return {
        choices,
        indices,
    }
}

export function getCurrentFileDirectory(url: string) {
    return new URL(url).pathname.split('/').slice(0, -1).join('/')
}

export const flattenObj = (obj: object, prefix = ''): Record<string, unknown> => {
    const flattenedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Object) {
            Object.assign(flattenedObj, flattenObj(value, prefix + '.' + key))
        } else {
            flattenedObj[prefix + '.' + key] = value
        }
    }
    return flattenedObj
}

type MergeOptions = {
    arrayStrategy?: 'concat' | 'update' | 'replace'
    ignoreNestedInArray?: boolean
    ignoreNestedInObject?: boolean
}
const arrayStrategyDefault = 'update'
const mergeNestedInArrayDefault = true
const mergeNestedInObjectDefault = true

// Merge two objects or arrays together. There are three options for handling arrays:
//     replace - replace the array (e.g. [1,2,3] + [4,5] = [4,5])
//     update - update the array element by element (e.g. [1,2,3] + [4,5] = [4,5,3])
// When arrayStrategy is set to 'replace' or 'update', nested merging options apply:
//      Enabling mergeNestedInArray will handle arrays of objects/arrays by merging them together, otherwise they will be treated as primitives
//          E.g. [[1]] + [[3]] = [[1,3]]
//      Enabling mergeNestedInObject will handle objects of objects/arrays by merging them together, otherwise they will be treated as primitives
//          E.g. [{a:1}] + [{c:3}] = [{a:1,c:3}]
// Nesting can be infinitely deep.
// Arrays can be homogeneous or hetrogeneous.
// The destination object/array is mutated directly.
export function merge<T extends object | A[], U extends object | B[], A, B>(
    dest: T,
    src: U,
    options?: MergeOptions
): T & U {
    const arrayStrategy = options?.arrayStrategy ?? arrayStrategyDefault
    const mergeNestedInArray = !options?.ignoreNestedInArray ?? mergeNestedInArrayDefault
    const mergeNestedInObject = !options?.ignoreNestedInObject ?? mergeNestedInObjectDefault
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
            if (arrayStrategy === 'concat') {
                if (mergeNestedInArray && src.every(isArray) && dest.every(isArray)) {
                    // e.g. src is [[1],[2]] and dest is [[3],[4]]
                    // want to produce [[1,2],[3,4]] instead of [[1],[2],[3],[4]]
                    // detect this by checking if all elements are arrays
                    // if so, then add them onto the queue to be merged
                    for (let i = 0; i < src.length; i++) {
                        // populate dest with empty array in case it is shorter than src
                        dest[i] = dest[i] ?? []
                        queue.push({
                            src: src[i],
                            dest: dest[i],
                        })
                    }
                } else {
                    // just do a normal concat
                    for (const el of src) {
                        dest.push(el)
                    }
                }
            } else if (arrayStrategy === 'replace' || arrayStrategy === 'update') {
                if (arrayStrategy === 'replace') {
                    // delete any items beyond the length of src
                    while (dest.length > src.length) {
                        dest.pop()
                    }
                }
                // copy the elements from src into dest
                for (let i = 0; i < src.length; i++) {
                    // mergeNestedInArray can stop us from merging arrays/objects and treat nested arrays/objects as primitives
                    if (
                        mergeNestedInArray &&
                        ((isArray(dest[i]) && isArray(src[i])) || (isObject(dest[i]) && isObject(src[i])))
                    ) {
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
            } else {
                throw new Error(`unknown array strategy: ${arrayStrategy}`)
            }
        } else if (isObject(task.dest)) {
            const src = task.src as object
            const destAny = task.dest as any
            // for every entry in src
            for (const [key, value] of Object.entries(src)) {
                if (
                    mergeNestedInObject &&
                    ((isArray(value) && isArray(destAny[key])) || (isObject(value) && isObject(destAny[key])))
                ) {
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
