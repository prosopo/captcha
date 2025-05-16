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
	type ConsolaOptions,
	type LogObject,
	type LogType,
	createConsola,
} from "consola";

export type Logger = {
	info(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	debug(...args: unknown[]): void;
	error(...args: unknown[]): void;
};

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
	if (logObject.type === ("error" as LogType)) {
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
export const getLogger = (scope: string) => {
	return createConsola({
		reporters: [
			{
				log: (logObj, ctx) => {
					const reporter = JSONReporter;
					// Attach requestId to the log object before passing it to JSONReporter
					const enhancedLogObj = { ...logObj };
					reporter(enhancedLogObj, ctx);
				},
			},
		],
		formatOptions: { colors: true, date: true },
	}).withTag(scope);
};
