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

export type LogObject = Record<string | number, unknown>;
export type LogRecord = {
	err?: Error | unknown;
	data?: LogObject;
	msg?: string;
};
export type LogRecordFn = () => LogRecord;

export type Logger = {
	setLogLevel(level: LogLevel): void;
	getLogLevel(): LogLevel;
	getScope(): string;
	info(fn: LogRecordFn): void;
	debug(fn: LogRecordFn): void;
	trace(fn: LogRecordFn): void;
	warn(fn: LogRecordFn): void;
	error(fn: LogRecordFn): void;
	fatal(fn: LogRecordFn): void;
	log(level: LogLevel, fn: LogRecordFn): void;
	/**
	 * Creates a new logger instance which includes the given object in every log message. Akin to a child logger.
	 * This is useful for adding context to log messages, such as user IDs, request IDs, etc.
	 * @param obj An object to log, which will be added to every log message.
	 */
	with(obj: LogObject): Logger;
};

export const InfoLevel = "info";
export const DebugLevel = "debug";
export const TraceLevel = "trace";
export const WarnLevel = "warn";
export const ErrorLevel = "error";
export const FatalLevel = "fatal";

export const LogLevel = z.enum([
	InfoLevel,
	DebugLevel,
	TraceLevel,
	WarnLevel,
	ErrorLevel,
	FatalLevel,
]);
export type LogLevel = z.infer<typeof LogLevel>;

export type LevelMap = {
	[K in LogLevel]: number;
};

const logLevelMap: LevelMap = {
	[TraceLevel]: 5,
	[DebugLevel]: 4,
	[InfoLevel]: 3,
	[WarnLevel]: 2,
	[ErrorLevel]: 1,
	[FatalLevel]: 0,
};

export function parseLogLevel(
	level: string | undefined,
	or: LogLevel = InfoLevel,
): LogLevel {
	const result = LogLevel.safeParse(level);
	return result.success ? result.data : or;
}

// Create a new logger with the given level and scope
export function getLogger(logLevel: LogLevel, scope: string): Logger {
	const logger = new NativeLogger(scope);
	logger.setLogLevel(logLevel);
	return logger;
}

const inBrowser =
	typeof window !== "undefined" && typeof window.document !== "undefined";

export const FormatJson = "json";
export const FormatPlain = "plain";
export const Format = z.enum([FormatJson, FormatPlain]);
export type Format = z.infer<typeof Format>;

/**
 * Native logger which uses console.log, console.error, etc, without any libraries.
 */
export class NativeLogger implements Logger {
	// the default data to be logged
	// this provides utility for adding properties to every log message
	private defaultData = {};
	private level: LogLevel;
	private levelNum: number;
	private pretty = 0; // pretty print indentation level - 0 = no pretty print, 2 = 2 spaces, etc
	private printStack = false; // whether to print the stack trace in the log
	private format: Format = FormatJson;

	constructor(
		private scope: string,
		private levelMap: LevelMap = logLevelMap,
	) {
		this.level = InfoLevel; // default log level
		this.levelNum = this.levelMap[this.level];
	}

	setFormat(format: Format): void {
		this.format = format;
	}

	getFormat(): Format {
		return this.format;
	}

	with(obj: LogObject): Logger {
		const newLogger = new NativeLogger(this.scope);
		newLogger.defaultData = { ...this.defaultData, ...obj };
		newLogger.setLogLevel(this.getLogLevel());
		return newLogger;
	}

	getPrintStack(): boolean {
		return this.printStack;
	}

	setPrintStack(printStack: boolean): void {
		this.printStack = printStack;
	}

	getPretty(): boolean {
		return this.pretty > 0;
	}

	setPretty(pretty: boolean): void {
		this.pretty = pretty ? 2 : 0;
	}

	getScope(): string {
		return this.scope;
	}

	setLogLevel(level: LogLevel): void {
		this.level = level;
		this.levelNum = this.levelMap[level];
	}

	getLogLevel(): LogLevel {
		return this.level;
	}

	private unpackError(err: Error): LogObject {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const e: any = err; // allow additional properties
		const data: LogObject = { err: err.message, name: err.name };
		if (this.printStack) {
			if (err.stack) {
				data.stack = err.stack;
			}
			if (e.stacktrace) {
				data.stacktrace = e.stacktrace; // for compatibility with some environments
			}
		}
		if (e.cause) {
			data.cause = e.cause; // include cause if available
		}
		if (e.code) {
			data.code = e.code; // include code if available
		}
		if (e.details) {
			data.details = e.details; // include details if available
		}
		if (e.context) {
			data.context = e.context; // include context if available
		}
		if (e.data) {
			data.data = e.data; // include data if available
		}
		if (e.info) {
			data.info = e.info; // include info if available
		}
		if (e.metadata) {
			data.metadata = e.metadata; // include metadata if available
		}
		if (e.status) {
			data.status = e.status; // include status if available
		}
		if (e.statusCode) {
			data.statusCode = e.statusCode; // include statusCode if available
		}
		if (e.cause) {
			// chainload errors can have a cause property
			if (e.cause instanceof Error) {
				// recurse into the cause
				data.cause = this.unpackError(e.cause as Error);
			} else {
				// if the cause is not an error, just include it as is
				data.cause = e.cause;
			}
		}
		return data;
	}

	private print(
		dest: (...args: unknown[]) => void,
		fn: LogRecordFn,
		level: LogLevel,
	): void {
		if (this.levelMap[level] > this.levelNum) {
			return; // skip logging if the level is higher than the current log level
		}
		const dateTime = new Date().toISOString();
		let { data, msg, err } = fn();
		const errData = err instanceof Error ? this.unpackError(err) : {};
		if (!msg && errData.message) {
			// if no message is provided, use the error message
			msg = String(errData.err) || String(errData.name);
		}
		data = { ...this.defaultData, ...errData, ...data };
		const baseRecord = { scope: this.scope, dateTime, level: this.level, data };
		if (inBrowser) {
			// no need to convert to json, dev tools will handle it
			if (msg) {
				// log the log record object separately to the message to utilize browser dev tools
				dest(msg, baseRecord);
			} else {
				dest(baseRecord);
			}
		} else {
			let output = "";
			// check the format to output
			if (this.format === FormatJson) {
				// add the message to the log record, as we're logging a single object only
				const record = { ...baseRecord, msg };
				// need to convert it to json
				output = JSON.stringify(record, null, this.pretty);
			} else if (this.format === FormatPlain) {
				// in plain format, we concat the log record fields into a string
				output = `${dateTime} ${level} ${this.scope}:${msg ? ` ${msg}` : ""}${Object.entries(data).length > 0 ? ` ${JSON.stringify(data)}` : ""}`;
			} else {
				throw new Error(`Unknown log format: ${this.format}`);
			}
			dest(output);
		}
	}

	info(fn: LogRecordFn): void {
		this.print(console.info.bind(console), fn, InfoLevel);
	}

	debug(fn: LogRecordFn): void {
		this.print(console.debug.bind(console), fn, DebugLevel);
	}

	trace(fn: LogRecordFn): void {
		this.print(console.trace.bind(console), fn, TraceLevel);
	}

	warn(fn: LogRecordFn): void {
		this.print(console.warn.bind(console), fn, WarnLevel);
	}

	error(fn: LogRecordFn): void {
		this.print(console.error.bind(console), fn, ErrorLevel);
	}

	fatal(fn: LogRecordFn): void {
		this.print(console.error.bind(console), fn, FatalLevel);
	}

	log(level: LogLevel, fn: LogRecordFn): void {
		switch (level) {
			case "trace":
				this.trace(fn);
				break;
			case "debug":
				this.debug(fn);
				break;
			case "info":
				this.info(fn);
				break;
			case "warn":
				this.warn(fn);
				break;
			case "error":
				this.error(fn);
				break;
			case "fatal":
				this.fatal(fn);
				break;
			default:
				throw new Error(`Unknown log level: ${level}`);
		}
	}
}
