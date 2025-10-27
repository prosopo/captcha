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

import type { TranslationKey } from "@prosopo/locale";
import type { ApiJsonError } from "@prosopo/types";
import type { TFunction } from "i18next";
import { ZodError } from "zod";
import { type LogLevel, type Logger, getLogger } from "./logger.js";

type BaseErrorOptions<ContextType> = {
	name?: string;
	translationKey?: TranslationKey;
	logger?: Logger;
	logLevel?: LogLevel;
	context?: ContextType;
	silent?: boolean;
	i18n?: { t: TFunction };
};

interface BaseContextParams {
	[key: string]: unknown;
	failedFuncName?: string;
	translationKey?: string;
	code?: number;
}

type EnvContextParams = BaseContextParams & { missingEnvVars?: string[] };
type ContractContextParams = BaseContextParams;
type DBContextParams = BaseContextParams & { captchaId?: string[] };
type CliContextParams = BaseContextParams;
type DatasetContextParams = BaseContextParams;
type ApiContextParams = BaseContextParams & {
	code?: number;
};

// if i18n is not loaded then we use this
const backupTranslationObj = { t: (key: string) => key };

export abstract class ProsopoBaseError<
	ContextType extends BaseContextParams = BaseContextParams,
> extends Error {
	translationKey: string | undefined;
	context: ContextType | undefined;

	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContextType>,
	) {
		const logger = options?.logger || getLogger("info", import.meta.url);
		const logLevel = options?.logLevel || "error";
		const i18n = options?.i18n || backupTranslationObj;
		if (error instanceof Error) {
			super(i18n.t(error.message));
			this.translationKey = options?.translationKey;
			this.context = {
				...(options?.context as ContextType),
				...(options?.translationKey
					? { translationMessage: i18n.t(options.translationKey) }
					: {}),
			};
		} else {
			super(i18n.t(error));
			this.translationKey = error;
			this.context = options?.context;
		}
		if (!options?.silent) this.logError(logger, logLevel, options?.name);
	}

	private logError(logger: Logger, logLevel: LogLevel, errorName?: string) {
		const errorParams = { error: this.message, context: this.context };
		const errorMessage = { errorType: errorName || this.name, errorParams };
		if (logLevel === "debug") {
			logger.debug(() => ({ data: { ...errorMessage, stack: this.stack } }));
			return;
		}
		logger.error(() => ({ data: { ...errorMessage } }));
	}
}

// Generic error class
export class ProsopoError extends ProsopoBaseError<BaseContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<BaseContextParams>,
	) {
		const errorName = options?.name || "ProsopoError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoEnvError extends ProsopoBaseError<EnvContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<EnvContextParams>,
	) {
		const errorName = options?.name || "ProsopoEnvError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoContractError extends ProsopoBaseError<ContractContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContractContextParams>,
	) {
		const errorName = options?.name || "ProsopoContractError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoTxQueueError extends ProsopoBaseError<ContractContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContractContextParams>,
	) {
		const errorName = options?.name || "ProsopoTxQueueError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoDBError extends ProsopoBaseError<DBContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<DBContextParams>,
	) {
		const errorName = options?.name || "ProsopoDBError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoCliError extends ProsopoBaseError<CliContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<CliContextParams>,
	) {
		const errorName = options?.name || "ProsopoCliError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoDatasetError extends ProsopoBaseError<DatasetContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<DatasetContextParams>,
	) {
		const errorName = options?.name || "ProsopoDatasetError";
		const optionsAll = { ...options, name: errorName };
		super(error, optionsAll);
	}
}

export class ProsopoApiError extends ProsopoBaseError<ApiContextParams> {
	code: number;

	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ApiContextParams>,
	) {
		const errorName = options?.name || "ProsopoApiError";
		const code = options?.context?.code || 500;
		const optionsAll = {
			...options,
			name: errorName,
			context: {
				...options?.context,
				code,
				...(error instanceof ProsopoBaseError && error.translationKey
					? { translationKey: error.translationKey }
					: {}),
			},
		};
		super(error, optionsAll);
		this.code = code;
	}
}

export const unwrapError = (
	err: ProsopoBaseError | SyntaxError | ZodError,
	i18nInstance?: { t: TFunction },
) => {
	const i18n = i18nInstance || backupTranslationObj;
	let code = "code" in err ? (err.code as number) : 400;

	const message = i18n.t(err.message); // should be translated already
	let jsonError: ApiJsonError = { code, message };
	const statusMessage = "Bad Request";
	jsonError.message = message;
	jsonError.key = "translationKey" in err ? err.translationKey : "API.UNKNOWN";
	jsonError.data =
		"data" in err && err.data ? (err.data as Record<string, unknown>) : {};

	// unwrap the errors to get the actual error message
	while (err instanceof ProsopoBaseError && err.context) {
		// base error will not have a translation key
		const contextTranslationKey =
			typeof err.context.translationKey === "string"
				? err.context.translationKey
				: undefined;
		jsonError.key =
			contextTranslationKey || err.translationKey || "API.UNKNOWN";
		jsonError.message = i18n.t(err.message);
		const contextCode =
			typeof err.context.code === "number" ? err.context.code : undefined;
		code = contextCode ?? jsonError.code;
		jsonError.data =
			(err.context.data as Record<string, unknown>) ||
			(jsonError.data as Record<string, unknown>) ||
			jsonError.data;
		// Only move to the next error if ProsopoBaseError or ZodError
		if (
			err.context.error &&
			(err.context.error instanceof ProsopoBaseError ||
				isZodError(err.context.error))
		) {
			err = err.context.error;
		} else {
			break;
		}
	}

	if (isZodError(err)) {
		if (typeof err.message === "object") {
			jsonError = err.message;
		} else {
			jsonError.message = JSON.parse(err.message);
			jsonError.key =
				jsonError.key !== "API.UNKNOWN" ? jsonError.key : "API.INVALID_BODY";
			code = 400;
		}
	}

	jsonError.code = code;
	if (jsonError.data && Object.keys(jsonError.data).length === 0) {
		//remove the key
		jsonError.data = undefined;
	}

	return { code, statusMessage, jsonError };
};

export const isZodError = (err: unknown): err is ZodError => {
	return Boolean(
		err && (err instanceof ZodError || (err as ZodError).name === "ZodError"),
	);
};
