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
import { ProsopoEnvError } from './error.js'
import { z } from 'zod'
import consola, { LogLevels as ConsolaLogLevels, LogLevel as ConsolaLogLevel } from 'consola/browser'

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

export const LogLevel = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
export type LogLevel = z.infer<typeof LogLevel>

// Create a new logger with the given level and scope
export function getLogger(logLevel: LogLevel | string, scope: string): Logger {
    return getLoggerAdapterConsola(getLogLevel(logLevel), scope)
}

// Get the default logger (i.e. the global logger)
export function getLoggerDefault(): Logger {
    return getLoggerAdapterConsola(LogLevel.enum.info, 'global')
}

const getLoggerAdapterConsola = (logLevel: LogLevel, scope: string): Logger => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    const logger = consola.create({}).withTag(scope)
    const result = {
        log: logger.log,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace,
        warn: logger.warn,
        error: logger.error,
        setLogLevel: (level: LogLevel | string) => {
            logger.level = ConsolaLogLevels[logLevel]
        },
        getLogLevel: () => {
            const logLevel = logger.level
            switch (logLevel) {
                case ConsolaLogLevels.trace: return LogLevel.enum.trace;
                case ConsolaLogLevels.debug: return LogLevel.enum.debug;
                case ConsolaLogLevels.info: return LogLevel.enum.info;
                case ConsolaLogLevels.warn: return LogLevel.enum.warn;
                case ConsolaLogLevels.error: return LogLevel.enum.error;
                case ConsolaLogLevels.fatal: return LogLevel.enum.fatal;
                default: throw new Error('LOG.INVALID_LOG_LEVEL')
            }
        },
    }
    result.setLogLevel(logLevel)
    return result
}

/**
 * Get the log level from the passed value or from environment variables or a default of `info`.
 * @param logTypeOption
 */
export function getLogLevel(logLevel?: string | LogLevel): LogLevel {
    logLevel = logLevel || process.env.LOG_LEVEL || 'Info'
    logLevel = logLevel.toString().toLowerCase()
    try {
        return LogLevel.parse(logLevel)
    } catch (e) {
        throw new ProsopoEnvError('CONFIG.INVALID_LOG_LEVEL', logLevel)
    }
}
