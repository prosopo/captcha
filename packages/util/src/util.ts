import _lodash from 'lodash'
import seedrandom from 'seedrandom'

// set the seed for the global rng, i.e. seed `Math.random()`
export const setSeedGlobal = (seed: number | string) => {
    seedrandom(seed, { global: true })
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
    seedrandom(seed, { global: true })
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
    const rng = seedrandom(seed)
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
