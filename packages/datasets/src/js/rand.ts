import seedrandom from 'seedrandom'

export interface RangeOptions {
    minInclusive?: boolean
    maxInclusive?: boolean
}

export interface ChoiceOptions {
    withReplacement?: boolean
    n: number
}

class Rand {
    private random: seedrandom.prng
    constructor(options: { seed: number | string }) {
        this.random = seedrandom(options.seed)
    }
    uint(): number {
        return Math.abs(this.random.int53())
    }
    int(): number {
        return this.random.int53()
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
    intRange(min: number, max: number, options?: RangeOptions): number {
        options = options || {}
        const minInclusive = options.minInclusive === undefined ? true : options.minInclusive
        const maxInclusive = options.maxInclusive === undefined ? false : options.maxInclusive
        const minOffset = minInclusive ? 0 : 1
        const maxOffset = maxInclusive ? 1 : 0
        return Math.abs(this.uint() % (max - min + minOffset + maxOffset)) + min + minOffset
    }
    shuffle<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.uint() % (i + 1)
            ;[array[i], array[j]] = [array[j], array[i]]
        }
        return array
    }
    choice<T>(
        array: T[],
        options?: ChoiceOptions
    ): {
        choices: T[]
        indices: number[]
        indicesSet: Set<number>
    } {
        options = options || { n: 1 }
        const withReplacement = options.withReplacement === undefined ? false : options.withReplacement

        const indicesSet = new Set<number>()
        const indices: number[] = []
        while (indices.length < options.n) {
            const index = Math.abs(Math.round(this.random())) % array.length
            // with replacement == allow duplicates
            // without replacement == don't allow duplicates
            if (withReplacement || indicesSet.add(index)) {
                indices.push(index)
            }
        }

        return {
            choices: indices.map((index) => array[index]),
            indices,
            indicesSet,
        }
    }
}

export const rand = (options: { seed: number | string }) => {
    return new Rand(options)
}
