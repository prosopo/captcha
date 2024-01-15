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
import { LogLevels as ConsolaLogLevels, createConsola } from 'consola'
import { ProsopoEnvError } from './error.js'
import { enum as zEnum, infer as zInfer } from 'zod'

// allows access to log levels via index, e.g. myLogger[LogLevel.enum.debug](...) or myLogger['error'](...), etc
type LoggerLevelFns = {
    [key in LogLevel]: (message: unknown, ...args: unknown[]) => void
}

export type Logger = {
    setLogLevel(level: LogLevel | string): void

    getLogLevel(): LogLevel
} & LoggerLevelFns

export const LogLevel = zEnum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'log'])
export type LogLevel = zInfer<typeof LogLevel>

// Create a new logger with the given level and scope
export function getLogger(logLevel: LogLevel | string, scope: string): Logger {
    return getLoggerAdapterConsola(getLogLevel(logLevel), scope)
}

// Get the default logger (i.e. the global logger)
export function getLoggerDefault(): Logger {
    return defaultLogger
}

const getLoggerAdapterConsola = (logLevel: LogLevel, scope: string): Logger => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    const logger = createConsola({}).withTag(scope)
    let currentLevel = logLevel
    const result = {
        log: logger.log,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace,
        warn: logger.warn,
        error: logger.error,
        fatal: logger.fatal,
        setLogLevel: (level: LogLevel | string) => {
            let logLevel = NaN
            level = getLogLevel(level) // sanitise
            switch (level) {
                case LogLevel.enum.trace:
                    logLevel = ConsolaLogLevels.trace
                    break
                case LogLevel.enum.debug:
                    logLevel = ConsolaLogLevels.debug
                    break
                case LogLevel.enum.info:
                    logLevel = ConsolaLogLevels.info
                    break
                case LogLevel.enum.warn:
                    logLevel = ConsolaLogLevels.warn
                    break
                case LogLevel.enum.error:
                    logLevel = ConsolaLogLevels.error
                    break
                case LogLevel.enum.fatal:
                    logLevel = ConsolaLogLevels.fatal
                    break
                default:
                    throw new Error('LOG.INVALID_LOG_LEVEL')
            }
            logger.level = logLevel
            currentLevel = level
        },
        getLogLevel: () => {
            return currentLevel
        },
    }
    result.setLogLevel(logLevel)
    return result
}

/**
 * Get the log level from the passed value or from environment variables or a default of `info`.
 * @param logLevel
 */
export function getLogLevel(logLevel?: string | LogLevel): LogLevel {
    logLevel = logLevel || process.env.PROSOPO_LOG_LEVEL || 'Info'
    logLevel = logLevel.toString().toLowerCase()
    try {
        return LogLevel.parse(logLevel)
    } catch (e) {
        throw new ProsopoEnvError('CONFIG.INVALID_LOG_LEVEL', logLevel)
    }
}

const defaultLogger = getLoggerAdapterConsola(LogLevel.enum.info, 'global')

export class Loggable {
    #logger: Logger

    constructor() {
        this.#logger = getLoggerDefault()
    }

    public get logger(): Logger {
        return this.#logger
    }

    public set logger(logger: Logger) {
        this.#logger = logger
    }
}
