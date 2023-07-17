import seedrandom from 'seedrandom'

export default class Rng {
    private random: seedrandom.prng
    constructor(options?: { seed: number | string }) {
        // init using the seed or the current time in milliseconds
        this.random = seedrandom(options?.seed || Date.now())
    }
    uint(): number {
        return Math.abs(this.int())
    }
    int(): number {
        const a = this.random.int32()
        const b = this.random.int32()
        // javascript only supports 53 bits of precision for integers, i.e. 2^53 is the max number. So we need to combine two 32 bit integers to get a 53 bit integer (with some redundant bits).
        // We can do this by shifting the first 32 bits by 21 bits to the left, and then adding the second 32 bits.
        return a + (b << 21)
    }
    double(): number {
        return this.random.double()
    }
    float(): number {
        return this.random.quick()
    }
    bool(): boolean {
        return this.random.int32() % 2 === 0
    }
    doubleRange(min: number, max: number): number {
        return this.random.double() * (max - min) + min
    }
    floatRange(min: number, max: number): number {
        return this.random.quick() * (max - min) + min
    }
    intRange(
        min: number,
        max: number,
        options?: {
            minInclusive?: boolean
            maxInclusive?: boolean
        }
    ): number {
        options = options || {}
        const minInclusive = options.minInclusive === undefined ? true : options.minInclusive
        const maxInclusive = options.maxInclusive === undefined ? false : options.maxInclusive
        const minOffset = minInclusive ? 0 : 1
        const maxOffset = maxInclusive ? 1 : 0
        return (this.uint() % (max - min + minOffset + maxOffset)) + min + minOffset
    }
    index(
        max: number,
        options?: {
            maxInclusive?: boolean
        }
    ): number {
        return this.intRange(0, max, options)
    }
    shuffle<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.uint() % (i + 1)
            ;[array[i], array[j]] = [array[j], array[i]]
        }
        return array
    }
    indices(
        length: number,
        options?: {
            withReplacement?: boolean
            n?: number
        }
    ): {
        indices: number[]
        indicesSet: Set<number>
    } {
        options = options || {}
        options.n = options.n || 1
        const indices: number[] = []
        const indicesSet = new Set<number>()
        while (indices.length < length) {
            const index = this.uint()
            // with replacement == allow duplicates
            // without replacement == don't allow duplicates
            if (options.withReplacement || indicesSet.add(index)) {
                indices.push(index)
            }
        }
        return {
            indices,
            indicesSet,
        }
    }
    choice<T>(
        array: T[],
        options?: {
            withReplacement?: boolean
            n: number
        }
    ): {
        choices: T[]
        indices: number[]
        indicesSet: Set<number>
    } {
        const result = this.indices(array.length, options)

        return {
            choices: result.indices.map((index) => array[index]),
            ...result,
        }
    }
}

export const rand = (options: { seed: number | string }) => {
    return new Rng(options)
}
