import consola, { LogLevel as ConsolaLogLevel } from 'consola'
import { Logger } from '@prosopo/types'
export { ConsolaLogLevel as LogLevel }
export function logger(level: ConsolaLogLevel, scope: string): Logger {
    return consola.create({ level }).withScope(scope)
}
