
export const isArray = (value: unknown): boolean => {
    // null passes the isArray check, so manually check for it
    return Array.isArray(value) && value !== null
}

export const isObject = (value: unknown): boolean => {
    return value instanceof Object && !isArray(value)
}
