import { isArray, isObject } from './checks.js'

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
