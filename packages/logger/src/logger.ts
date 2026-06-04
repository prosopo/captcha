// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { stringifyBigInts } from "@prosopo/util";
import { z } from "zod";

export { stringifyBigInts };

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
	 * Creates a child logger with merged default data and an optional subscope appended to the
	 * current scope (e.g. parent "database" + subscope "queries" → "database:queries").
	 * The child's effective level is resolved from PROSOPO_LOG_LEVEL directives for the new scope,
	 * falling back to the parent's level when no directive matches.
	 */
	with(obj: LogObject, subscope?: string): Logger;
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
	[TraceLevel]: 0,
	[DebugLevel]: 1,
	[InfoLevel]: 2,
	[WarnLevel]: 3,
	[ErrorLevel]: 4,
	[FatalLevel]: 5,
};

export function parseLogLevel(
	level: string | undefined,
	or: LogLevel = InfoLevel,
): LogLevel {
	const result = LogLevel.safeParse(level);
	return result.success ? result.data : or;
}

// ---------------------------------------------------------------------------
// Directive-based filtering
//
// PROSOPO_LOG_LEVEL supports both a bare level and a comma-separated directive
// string with optional per-scope overrides, e.g.:
//   "warn"                         – global floor
//   "warn,database=trace"          – global warn, database:* gets trace
//   "database=trace,http=debug"    – per-scope only, no global default
//
// Scope segments are separated by ":" mirroring module paths, e.g.
//   "provider:db=debug" matches any logger whose scope starts with "provider:db".
// ---------------------------------------------------------------------------

export type Directives = Map<string, LogLevel>;

/**
 * Parse a PROSOPO_LOG_LEVEL directive string into a scope→level map.
 * An entry with an empty-string key represents the global default.
 */
export function parseDirectives(raw: string): Directives {
	const map: Directives = new Map();
	for (const part of raw.split(",")) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) {
			const parsed = LogLevel.safeParse(trimmed);
			if (parsed.success) map.set("", parsed.data);
		} else {
			const scope = trimmed.slice(0, eqIdx).trim();
			const parsed = LogLevel.safeParse(trimmed.slice(eqIdx + 1).trim());
			if (parsed.success) map.set(scope, parsed.data);
		}
	}
	return map;
}

/**
 * Find the most specific directive that matches the given scope.
 * Walks from the full scope up to the empty-string global default.
 * Returns the fallback if nothing matches.
 */
export function resolveLevel(
	scope: string,
	directives: Directives,
	fallback: LogLevel,
): LogLevel {
	if (directives.has(scope)) return directives.get(scope) as LogLevel;
	const parts = scope.split(":");
	for (let i = parts.length - 1; i > 0; i--) {
		const prefix = parts.slice(0, i).join(":");
		if (directives.has(prefix)) return directives.get(prefix) as LogLevel;
	}
	if (directives.has("")) return directives.get("") as LogLevel;
	return fallback;
}

let _globalDirectives: Directives | undefined;

function getGlobalDirectives(): Directives {
	if (!_globalDirectives) {
		const raw =
			typeof process !== "undefined"
				? (process.env["PROSOPO_LOG_LEVEL"] ?? "")
				: "";
		_globalDirectives = parseDirectives(raw);
	}
	return _globalDirectives;
}

/**
 * Override the global directives at runtime (useful in tests or at app startup).
 * Accepts the same directive string as PROSOPO_LOG_LEVEL.
 */
export function setGlobalDirectives(raw: string): void {
	_globalDirectives = parseDirectives(raw);
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

	with(obj: LogObject, subscope?: string): Logger {
		const newScope = subscope ? `${this.scope}:${subscope}` : this.scope;
		const newLogger = new NativeLogger(newScope, this.levelMap);
		newLogger.defaultData = { ...this.defaultData, ...obj };
		newLogger.setPretty(this.getPretty());
		newLogger.setPrintStack(this.getPrintStack());
		newLogger.setLogLevel(
			resolveLevel(newScope, getGlobalDirectives(), this.getLogLevel()),
		);
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
		// Prefer translationKey when present (e.g. ProsopoBaseError) so the
		// top-level `err` field is locale-stable and queryable.
		const msg = e.translationKey || e.message || e.msg || "";
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
		// Re-resolve at print time so directives set after construction are respected.
		const effectiveLevelNum =
			this.levelMap[resolveLevel(this.scope, getGlobalDirectives(), this.level)];
		if (this.levelMap[level] < effectiveLevelNum) {
			return; // skip logging if the level is below the effective threshold
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
		} = { scope: this.scope, ts, level };
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
			// conversion to avoid "TypeError: Do not know how to serialize a BigInt" in JSON.stringify
			const logRecord = stringifyBigInts(baseRecord) as object;

			const output = JSON.stringify(logRecord, null, this.pretty);
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
