// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import consola, { LogLevel as ConsolaLogLevel } from 'consola'
export interface Logger {
    log(message: unknown, ...args: unknown[]): void
    info(message: unknown, ...args: unknown[]): void
    debug(message: unknown, ...args: unknown[]): void
    trace(message: unknown, ...args: unknown[]): void
    warn(message: unknown, ...args: unknown[]): void
    error(message: unknown, ...args: unknown[]): void
    setLogLevel(level: LogLevel | string): void
    getLogLevel(): LogLevel
}

export const LogLevelSchema = z.enum(['Silent', 'Error', 'Warn', 'Log', 'Info', 'Debug', 'Trace', 'Verbose'])
export type LogLevel = z.infer<typeof LogLevelSchema>

export function* getLogLevelKeys(): Generator<string> {
    for (const level in LogLevelSchema.enum) {
        if (isNaN(Number(level))) {
            yield level
        }
    }
}

export function* getLogLevelValues(): Generator<LogLevel> {
    for (const level in LogLevelSchema.enum) {
        if (!isNaN(Number(level))) {
            yield Number(level) as unknown as LogLevel
        }
    }
}

export const parseLogLevel = (logLevel: string | LogLevel | number | undefined): LogLevel => {
    try {
        return LogLevelSchema.parse(logLevel)
    } catch {
        console.warn(`Invalid log level: ${logLevel}`)
        return LogLevelSchema.enum.Info
    }
}

// Create a new logger with the given level and scope
export function getLogger(logLevel: LogLevel | string, scope: string): Logger {
    // console.log('a', parseLogLevel(0))
    // console.log('a', parseLogLevel(1))
    // console.log('a', parseLogLevel('0'))
    // console.log('a', parseLogLevel('error'))
    // console.log('a', parseLogLevel('info'))
    // console.log('a', parseLogLevel('TrAcE'))
    // console.log('a', parseLogLevel(-1))
    // console.log('a', parseLogLevel('-1'))

    return getLoggerAdapterConsola(parseLogLevel(logLevel), scope)
}

// Get the default logger (i.e. the global logger)
export function getLoggerDefault(): Logger {
    return getLoggerAdapterConsola(LogLevelSchema.enum.Info, '')
}

const getLoggerAdapterConsola = (logLevel: LogLevel, scope: string): Logger => {
    // automatically maps 0,1,2... to consola's log levels (which conveniently match... :O )
    const convertToConsolaLevel = (logLevel: LogLevel | string): ConsolaLogLevel => {
        return parseLogLevel(logLevel) as unknown as ConsolaLogLevel
    }
    const convertFromConsolaLevel = (logLevel: ConsolaLogLevel): LogLevel => {
        return parseLogLevel(logLevel as unknown as LogLevel)
    }
    // @ts-ignore
    const logger = consola.create({ level: convertToConsolaLevel(logLevel) }).withScope(scope)
    return {
        log: logger.log,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace,
        warn: logger.warn,
        error: logger.error,
        setLogLevel: (level: LogLevel | string) => {
            logger.level = convertToConsolaLevel(level)
        },
        getLogLevel: () => {
            return convertFromConsolaLevel(logger.level)
        },
    }
}

/**
 * Get the log level from the passed value or from environment variables or a default of `info`.
 * @param logTypeOption
 */
export function getLogLevel(logTypeOption?: string): LogLevel {
    const _ = lodash()
    const logType = _.capitalize(logTypeOption || process.env.LOG_LEVEL || 'info')
    return LogLevelSchema.parse(logType)
}
