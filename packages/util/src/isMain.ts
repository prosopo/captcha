import { fileURLToPath } from 'node:url'
// https://stackoverflow.com/a/76582917
/**
 * Determines whether a module is the entry point for the running node process.
 * This works for both CommonJS and ES6 environments.
 *
 * ### CommonJS
 * ```js
 * if (moduleIsEntry(module)) {
 *     console.log('WOO HOO!!!');
 * }
 * ```
 *
 * ### ES6
 * ```js
 * if (moduleIsEntry(import.meta.url)) {
 *     console.log('WOO HOO!!!');
 * }
 * ```
 */
export const isMain = (
    moduleOrImportMetaUrl: NodeModule | string,
    binName?: string
) => {
    if (typeof moduleOrImportMetaUrl === 'string') {
        return (
            process.argv[1] === fileURLToPath(moduleOrImportMetaUrl) ||
            // could be running with npx
            (binName &&
                process.argv[1] &&
                process.argv[1].indexOf(`node_modules/.bin/${binName}`) > -1)
        )
    }

    if (typeof require !== 'undefined' && 'exports' in moduleOrImportMetaUrl) {
        return require.main === moduleOrImportMetaUrl
    }

    return false
}
