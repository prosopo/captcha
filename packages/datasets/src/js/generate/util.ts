import { Item, LabelledItem } from '@prosopo/types'

export const checkDuplicates = (
    labelled: LabelledItem[],
    unlabelled: Item[],
    options: {
        allowDuplicatesLabelled?: boolean
        allowDuplicatesUnlabelled?: boolean
    }
) => {
    // check for duplicates
    const all = new Set<string>()
    if (!options.allowDuplicatesLabelled) {
        for (const entry of labelled) {
            if (all.has(entry.data)) {
                throw new Error(`Duplicate data entry in labelled data: ${JSON.stringify(entry)}`)
            }
            all.add(entry.data)
        }
    }
    if (!options.allowDuplicatesUnlabelled) {
        for (const entry of unlabelled) {
            if (all.has(entry.data)) {
                throw new Error(`Duplicate data entry in unlabelled data: ${JSON.stringify(entry)}`)
            }
        }
    }
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
    while (indices.length < n) {
        const index = Math.abs(Math.round(random())) % items.length
        // with replacement == allow duplicates
        // without replacement == don't allow duplicates
        if (options.withReplacement || indicesSet.add(index)) {
            indices.push(index)
        }
    }

    return {
        choices: indices.map((index) => items[index]),
        indices,
    }
}
