// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import {
	LogLevels as ConsolaLogLevels,
	type ConsolaOptions,
	type LogObject,
	createConsola,
} from "consola/browser";
import { enum as zEnum, type infer as zInfer } from "zod";
import { ProsopoEnvError } from "./error.js";

// allows access to log levels via index, e.g. myLogger[LogLevel.enum.debug](...) or myLogger['error'](...), etc
type LoggerLevelFns = {
	[key in LogLevel]: (message: unknown, ...args: unknown[]) => void;
};

export type Logger = {
	setLogLevel(level: LogLevel | string): void;

	getLogLevel(): LogLevel;
} & LoggerLevelFns;

export const LogLevel = zEnum([
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
	"log",
]);
export type LogLevel = zInfer<typeof LogLevel>;

// Create a new logger with the given level and scope and optional request ID
export function getLogger(
	logLevel: LogLevel | string,
	scope: string,
	requestId?: string,
): Logger {
	return getLoggerAdapterConsola(getLogLevel(logLevel), scope, requestId);
}

// Get the default logger (i.e. the global logger)
export function getLoggerDefault(): Logger {
	return defaultLogger;
}

const JSONReporter = (
	logObject: LogObject,
	context: {
		options: ConsolaOptions;
	},
) => {
	// https://stackoverflow.com/a/65886224
	const writer = process?.stdout
		? process.stdout.write.bind(process.stdout)
		: console.info;
	const writerError = process?.stderr
		? process.stderr.write.bind(process.stderr)
		: console.error;
	if (logObject.type === LogLevel.enum.error) {
		if (logObject.args.length > 0 && logObject.args[0] instanceof Error) {
			const error = logObject.args[0] as Error;
			const logObjectError = {
				...logObject,
				args: [error.message],
			};
			writerError(`${JSON.stringify(logObjectError)}\n`);
		} else {
			writerError(`${JSON.stringify(logObject)}\n`);
		}
	} else {
		writer(`${JSON.stringify(logObject)}\n`);
	}
};

const getLoggerAdapterConsola = (
	logLevel: LogLevel,
	scope: string,
	requestId?: string,
): Logger => {
	const logger = createConsola({
		reporters: [
			{
				log: (logObj, ctx) => {
					const reporter = JSONReporter;
					// Attach requestId to the log object before passing it to JSONReporter
					const enhancedLogObj = { ...logObj, requestId };
					reporter(enhancedLogObj, ctx);
				},
			},
		],
		formatOptions: { colors: true, date: true },
	}).withTag(scope);
	let currentLevel = logLevel;
	const result = {
		log: logger.log,
		info: logger.info,
		debug: logger.debug,
		trace: logger.trace,
		warn: logger.warn,
		error: logger.error,
		fatal: logger.fatal,
		setLogLevel: (level: LogLevel | string) => {
			let logLevel = Number.NaN;
			const levelSafe = getLogLevel(level); // sanitise
			switch (levelSafe) {
				case LogLevel.enum.trace:
					logLevel = ConsolaLogLevels.trace;
					break;
				case LogLevel.enum.debug:
					logLevel = ConsolaLogLevels.debug;
					break;
				case LogLevel.enum.info:
					logLevel = ConsolaLogLevels.info;
					break;
				case LogLevel.enum.warn:
					logLevel = ConsolaLogLevels.warn;
					break;
				case LogLevel.enum.error:
					logLevel = ConsolaLogLevels.error;
					break;
				case LogLevel.enum.fatal:
					logLevel = ConsolaLogLevels.fatal;
					break;
				case LogLevel.enum.log:
					logLevel = ConsolaLogLevels.log;
					break;
				default:
					// this cannot be a ProsopoEnvError. The default logger calls this method, which creates a new ProsopoEnvError, which requires the default logger, which hasn't been constructed yet, leading to ts not being able to find getLoggerDefault() during runtime as it has not completed yet (I think).
					// Either way, this should never happen in runtime, this error is just an edge case, every log level should be translated properly.
					throw new Error(
						`Invalid log level translation to consola's log level: ${level}`,
					);
			}
			logger.level = logLevel;
			currentLevel = levelSafe;
		},
		getLogLevel: () => {
			return currentLevel;
		},
	};
	result.setLogLevel(logLevel);
	return result;
};

/**
 * Get the log level from the passed value or from environment variables or a default of `info`.
 * @param logLevel
 */
export function getLogLevel(logLevel?: string | LogLevel): LogLevel {
	const logLevelLocal = logLevel || process.env.PROSOPO_LOG_LEVEL || "Info";
	const logLevelStr = logLevelLocal.toString().toLowerCase();
	try {
		return LogLevel.parse(logLevelStr);
	} catch (e) {
		throw new ProsopoEnvError("CONFIG.INVALID_LOG_LEVEL", {
			context: { logLevel },
		});
	}
}

const defaultLogger = getLoggerAdapterConsola(LogLevel.enum.info, "global");

export class Loggable {
	#logger: Logger;

	constructor() {
		this.#logger = getLoggerDefault();
	}

	public get logger(): Logger {
		return this.#logger;
	}

	public set logger(logger: Logger) {
		this.#logger = logger;
	}
}

export const logError = (err: unknown, logger: Logger): void => {
	logger.error(
		typeof err === "object" && err ? ("stack" in err ? err.stack : err) : err,
	);
};
