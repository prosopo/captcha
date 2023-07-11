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
