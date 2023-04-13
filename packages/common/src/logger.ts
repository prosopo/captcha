import consola, { LogLevel as ConsolaLogLevel } from 'consola'
export type Logger = typeof consola
export { ConsolaLogLevel as LogLevel }
export function logger(level: ConsolaLogLevel, scope: string): Logger {
    return consola.create({ level }).withScope(scope)
}
