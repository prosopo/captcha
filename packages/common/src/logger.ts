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
import consola, { LogLevel as ConsolaLogLevel } from 'consola'

export interface Logger {
    log(message: unknown, ...args: unknown[]): void
    info(message: unknown, ...args: unknown[]): void
    debug(message: unknown, ...args: unknown[]): void
    trace(message: unknown, ...args: unknown[]): void
    warn(message: unknown, ...args: unknown[]): void
    error(message: unknown, ...args: unknown[]): void
    setLogLevel(level: LogLevel): void
    getLogLevel(): LogLevel
}

export enum LogLevel {
    Silent = Number.NEGATIVE_INFINITY,
    Error = 0,
    Warn = 1,
    Log = 2,
    Info = 3,
    Debug = 4,
    Trace = 5,
    Verbose = Number.POSITIVE_INFINITY,
}

// Create a new logger with the given level and scope
export function getLogger(logLevel: LogLevel | string, scope: string): Logger {
    const level = typeof logLevel === 'string' ? LogLevel[logLevel] : logLevel
    return getLoggerAdapterConsola(level, scope)
}

// Get the default logger (i.e. the global logger)
export function getLoggerDefault(): Logger {
    return getLoggerAdapterConsola(LogLevel.Info, '')
}

const getLoggerAdapterConsola = (logLevel: LogLevel, scope: string): Logger => {
    // automatically maps 0,1,2... to consola's log levels (which conveniently match... :O )
    const convertToLevel = (logLevel: LogLevel): ConsolaLogLevel => {
        return ConsolaLogLevel[LogLevel[logLevel] as keyof typeof ConsolaLogLevel]
    }
    const convertFromLevel = (logLevel: ConsolaLogLevel): LogLevel => {
        return LogLevel[ConsolaLogLevel[logLevel] as keyof typeof LogLevel]
    }
    const logger = consola.create({ level: convertToLevel(logLevel) }).withScope(scope)
    return {
        log: logger.log,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace,
        warn: logger.warn,
        error: logger.error,
        setLogLevel: (level: LogLevel) => {
            logger.level = convertToLevel(level)
        },
        getLogLevel: () => {
            return convertFromLevel(logger.level)
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
    return LogLevel[logType as keyof typeof LogLevel]
}
