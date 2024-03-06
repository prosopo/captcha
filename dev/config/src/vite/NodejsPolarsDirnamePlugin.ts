import { Logger } from '@prosopo/common'

export const nodejsPolarsDirnamePlugin = (logger: Logger) => {
    const name = 'nodejs-polars-dirname-plugin'
    return {
        name,
        resolveId(source: string, importer: string | undefined, options: any) {
            // aim for the node_modules/nodejs-polars/bin/native-polars.js file
            if (source.endsWith('nodejs-polars/bin/native-polars.js')) {
                logger.debug(name, 'resolves', source, 'imported by', importer)
                // return the source to indicate this plugin can resolve the import
                return source
            }
            // return null if this plugin can't resolve the import
            return null
        },
        transform(code: string, id: string) {
            // aim for the node_modules/nodejs-polars/bin/native-polars.js file
            if (id.endsWith('nodejs-polars/bin/native-polars.js')) {
                // replace all instances of __dirname with the path relative to the output bundle
                logger.debug(name, 'transform', id)
                const newCode = code.replaceAll(
                    `__dirname`,
                    `new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`
                )
                return newCode
            }
            // else return the original code (leave code unrelated to nodejs-polars untouched)
            return code
        },
    }
}
