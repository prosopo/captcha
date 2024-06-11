type ChoiceOptions = {
    withReplacement?: boolean
}
export function choice<T>(items: T[], n: number, random: () => number, options?: ChoiceOptions): T[] {
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
