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
