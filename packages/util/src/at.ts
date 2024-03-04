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
