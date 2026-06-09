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

import type { TranslationKey } from "@prosopo/locale";
import type { ApiJsonError } from "@prosopo/types";
import { ZodError } from "zod";
import type { ValidErrorKey } from "./errorKeys.js";

type BaseErrorOptions<ContextType> = {
	name?: string;
	translationKey?: TranslationKey;
	message?: string;
	context?: ContextType;
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

export abstract class ProsopoBaseError<
	ContextType extends BaseContextParams = BaseContextParams,
> extends Error {
	translationKey: TranslationKey | undefined;
	message: string;
	context: ContextType | undefined;
	cause: Error | undefined;

	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContextType>,
	) {
		if (error instanceof Error) {
			super(error.message);
			this.cause = error;
			this.translationKey = options?.translationKey;
			this.message = options?.message || error.message;
		} else {
			const fallback = options?.message || error;
			super(fallback);
			this.translationKey = error;
			this.message = fallback;
		}
		this.context = options?.context;
		this.name = options?.name || this.constructor.name;
	}
}

// Generic error class
export class ProsopoError extends ProsopoBaseError<BaseContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<BaseContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoEnvError extends ProsopoBaseError<EnvContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<EnvContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoContractError extends ProsopoBaseError<ContractContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContractContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoTxQueueError extends ProsopoBaseError<ContractContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<ContractContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoDBError extends ProsopoBaseError<DBContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<DBContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoCliError extends ProsopoBaseError<CliContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<CliContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoDatasetError extends ProsopoBaseError<DatasetContextParams> {
	constructor(
		error: Error | TranslationKey,
		options?: BaseErrorOptions<DatasetContextParams>,
	) {
		super(error, options);
	}
}

export class ProsopoApiError extends ProsopoBaseError<ApiContextParams> {
	code: number;

	constructor(
		error: Error | ValidErrorKey,
		options?: BaseErrorOptions<ApiContextParams>,
	) {
		const code = options?.context?.code || 500;
		const optionsAll = {
			...options,
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
) => {
	let code = "code" in err ? (err.code as number) : 400;
	const baseError = err as ProsopoBaseError;

	let jsonError: ApiJsonError = {
		code,
		message: baseError.message || baseError.translationKey || err.message,
	};
	const statusMessage = "Bad Request";
	jsonError.key =
		baseError.translationKey ?? "API.UNKNOWN";

	// unwrap the errors to get the actual error message
	while (err instanceof ProsopoBaseError && err.context) {
		const contextTranslationKey =
			typeof err.context.translationKey === "string"
				? err.context.translationKey
				: undefined;
		jsonError.key =
			contextTranslationKey || err.translationKey || "API.UNKNOWN";
		jsonError.message = err.message || err.translationKey || "Unknown error";
		jsonError.data = err.context.data as Record<string, unknown> | undefined;

		const contextCode =
			typeof err.context.code === "number" ? err.context.code : undefined;
		code = contextCode ?? jsonError.code;
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
	return { code, statusMessage, jsonError };
};

export const isZodError = (err: unknown): err is ZodError => {
	return Boolean(
		err && (err instanceof ZodError || (err as ZodError).name === "ZodError"),
	);
};
