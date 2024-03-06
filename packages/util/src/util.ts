// sleep for some milliseconds
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function getCurrentFileDirectory(url: string) {
    return new URL(url).pathname.split('/').slice(0, -1).join('/')
}

export const flatten = (obj: object, prefix = ''): Record<string, unknown> => {
    const flattenedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Object) {
            Object.assign(flattenedObj, flatten(value, prefix + key + '.'))
        } else {
            flattenedObj[prefix + key] = value
        }
    }
    return flattenedObj
}

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
export const kebabCase = (str: string) =>
    str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())
