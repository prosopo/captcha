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
