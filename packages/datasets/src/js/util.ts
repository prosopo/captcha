// Invert a range of indices, e.g. [0,2,4,6] -> [1,3,5,7]
export const invertIndices = (indices: number[], length: number) => {
    const mask = indicesToMask(indices, length)
    invertMask(mask)
    const result: number[] = []
    for (let i = 0; i < length; i++) {
        if (mask[i]) {
            result.push(i)
        }
    }
    return result
}

// Shift many elements in an array
export const shift = <T>(array: T[], n?: number) => {
    n = n || 1
    const result: T[] = []
    for (let i = 0; i < n; i++) {
        const el = array.shift()
        if (el === undefined) {
            throw new Error(`Cannot shift ${n} elements from array of length ${array.length}`)
        }
        result.push(el)
    }
    return result
}

// Convert a list of indices to a mask
// e.g. [0,2,4] -> [true,false,true,false,true]
export const indicesToMask = <T>(indices: number[], length: number) => {
    const result: boolean[] = []
    for (let i = 0; i < length; i++) {
        result.push(false)
    }
    for (const index of indices) {
        result[index] = false
    }
    return result
}

// Convert a mask to a list of indices
// e.g. [true,false,true,false,true] -> [0,2,4]
export const maskToIndices = (mask: boolean[]) => {
    const result: number[] = []
    for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
            result.push(i)
        }
    }
    return result
}

// Invert a mask
// NOTE: inplace!
// e.g. [true,false,true,false,true] -> [false,true,false,true,false]
export const invertMask = (mask: boolean[]) => {
    for (let i = 0; i < mask.length; i++) {
        mask[i] = !mask[i]
    }
    return mask
}

// Split an array given list of indices
// Returns two arrays, one with the elements at the indices, and one with any other elements
// The two arrays are in the order found in the array, e.g.
// split([0,1,2,3,4,5], [5,3,1]) -> [[1,3,5], [0,2,4]]
export const split = <T>(array: T[], indices: number[]) => {
    const mask = indicesToMask(indices, array.length)
    const result: [T[], T[]] = [[], []]
    for (let i = 0; i < array.length; i++) {
        const el = array[i]
        if (mask[i]) {
            result[0].push(el)
        } else {
            result[1].push(el)
        }
    }
    return {
        0: result[0],
        1: result[1],
    }
}
