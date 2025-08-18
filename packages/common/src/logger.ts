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

export type LogObject = object;
export type LogRecord = {
	err?: unknown;
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
	getPretty(): boolean;
	setPretty(pretty: boolean): void;
	getPrintStack(): boolean;
	setPrintStack(printStack: boolean): void;
	getFormat(): Format;
	setFormat(format: Format): void;
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
	private defaultData: LogObject | undefined;
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
		if (this.format !== FormatJson) {
			throw new Error("Only JSON format implemented for now"); // for performance reasons
		}
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

	private unpackError(err: Error | object): { msg: string; data: LogRecord } {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const e: any = err; // allow additional properties
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const data: any = { ...err };
		data.name = e.name || "Error";
		if (this.printStack) {
			if (e.stack) {
				data.stack = e.stack;
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
		const msg = e.message || e.msg || "";
		if (e.message && e.msg) {
			// duplicate message, defer msg to data
			data.msg = e.msg;
		}
		return {
			msg,
			data,
		};
	}

	private print(
		dest: (...args: unknown[]) => void,
		fn: LogRecordFn,
		level: LogLevel,
	): void {
		if (this.levelMap[level] > this.levelNum) {
			return; // skip logging if the level is higher than the current log level
		}
		const ts = new Date().toISOString();
		// populate the log fields using the fn
		let { data, msg, err } = fn();
		let errMsg: string | undefined;
		let errData: LogRecord | undefined;
		if (err) {
			if (err instanceof Error || typeof err === "object") {
				// if it's an instance of Error, unpack the standard fields (e.g. message, name, stack, etc)
				const result = this.unpackError(err);
				errMsg = result.msg;
				errData = result.data;
			} else {
				// primitive
				errMsg = String(err);
			}
		}
		// add any default data to the data object
		if (this.defaultData) {
			data = { ...this.defaultData, ...data };
		}
		const baseRecord: {
			scope: string;
			ts: string;
			level: LogLevel;
			data?: LogObject;
			msg?: string;
			err?: string;
			errData?: LogRecord;
		} = { scope: this.scope, ts, level: this.level };
		if (data) {
			baseRecord.data = data;
		}
		if (msg) {
			baseRecord.msg = msg;
		}
		if (errMsg) {
			baseRecord.err = errMsg;
		}
		if (errData) {
			baseRecord.errData = errData;
		}

		if (inBrowser) {
			// no need to convert to json, dev tools will handle it
			if (msg || errMsg) {
				// log the log record object separately to the message to utilize browser dev tools
				dest(msg || errMsg, baseRecord);
			} else {
				dest(baseRecord);
			}
		} else {
			const output = JSON.stringify(baseRecord, null, this.pretty);
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
