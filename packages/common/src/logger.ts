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

import { z } from "zod";
import pino from "pino";

export type LogObject = object | Error;

export type Logger = {
	setLogLevel(level: LogLevel): void;
	getLogLevel(): LogLevel;
	getScope(): string;
	info(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	debug(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	trace(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	warn(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	error(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	fatal(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	log(level: LogLevel, obj: LogObject, msg?: string, ...msgArgs: unknown[]): void;
	/**
	 * Creates a new logger instance which includes the given object in every log message. Akin to a child logger.
	 * This is useful for adding context to log messages, such as user IDs, request IDs, etc.
	 * @param obj An object to log, which will be added to every log message.
	 */
	with(obj: LogObject): Logger;
};

export const InfoLevel = 'info'
export const DebugLevel = 'debug'
export const TraceLevel = 'trace'
export const WarnLevel = 'warn'
export const ErrorLevel = 'error'
export const FatalLevel = 'fatal'

export const LogLevel = z.enum([
	InfoLevel,
	DebugLevel,
	TraceLevel,
	WarnLevel,
	ErrorLevel,
	FatalLevel
]);
export type LogLevel = z.infer<typeof LogLevel>;

export function parseLogLevel(
	level: string | undefined,
	or: LogLevel = InfoLevel,
): LogLevel {
	const result = LogLevel.safeParse(level)
	return result.success ? result.data : or;
}

// Create a new logger with the given level and scope
export function getLogger(
	logLevel: LogLevel,
	scope: string
): Logger {
	const logger = new PinoLogger(scope)
	logger.setLogLevel(logLevel);
	return logger
}

export class PinoLogger implements Logger {
	private logger: pino.Logger;

	constructor(scope: string) {
		this.logger = pino.default({
			name: scope,
			nestedKey: "data",
			browser: {
				asObject: true,
			}
		});
	}

	with(obj: LogObject): Logger {
		const newLogger = this.logger.child(obj);
		const child = new PinoLogger('');
		child.logger = newLogger;
		child.setLogLevel(this.getLogLevel());
		return child
	}

	getScope(): string {
		return this.logger.bindings().name || "default";
	}

	setLogLevel(level: LogLevel | string): void {
		this.logger.level = level;
	}

	getLogLevel(): LogLevel {
		switch (this.logger.level) {
			case "trace":
				return "trace";
			case "debug":
				return "debug";
			case "info":
				return "info";
			case "warn":
				return "warn";
			case "error":
				return "error";
			case "fatal":
				return "fatal";
			default:
				throw new Error(`Unknown log level: ${this.logger.level}`);
		}
	}

	info(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.info({ obj }, msg, ...msgArgs);
	}

	debug(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.debug({ obj }, msg, ...msgArgs);
	}

	trace(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.trace({ obj }, msg, ...msgArgs);
	}

	warn(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.warn({ obj }, msg, ...msgArgs);
	}

	error(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.error({ obj }, msg, ...msgArgs);
	}

	fatal(obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		this.logger.fatal({ obj }, msg, ...msgArgs);
	}

	log(level: LogLevel, obj: LogObject, msg?: string, ...msgArgs: unknown[]): void {
		switch (level) {
			case "trace":
				this.trace(obj, msg, ...msgArgs);
				break;
			case "debug":
				this.debug(obj, msg, ...msgArgs);
				break;
			case "info":
				this.info(obj, msg, ...msgArgs);
				break;
			case "warn":
				this.warn(obj, msg, ...msgArgs);
				break;
			case "error":
				this.error(obj, msg, ...msgArgs);
				break;
			case "fatal":
				this.fatal(obj, msg, ...msgArgs);
				break;
			default:
				throw new Error(`Unknown log level: ${level}`);
		}
	}
}

