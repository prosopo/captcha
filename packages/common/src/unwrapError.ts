// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { i18n as i18next } from "@prosopo/locale";
import { ZodError } from "zod";
import { type ProsopoApiError, ProsopoBaseError } from "./error.js";
import type { ApiJsonError } from "./types/api.js";

export const unwrapError = (err: ProsopoApiError | SyntaxError | ZodError) => {
	const code = "code" in err ? err.code : 400;
	let message = err.message;
	let jsonError: ApiJsonError = { code, message };
	let statusMessage = err.message;
	jsonError.message = message;
	// unwrap the errors to get the actual error message
	while (err instanceof ProsopoBaseError && err.context) {
		// base error will not have a translation key
		jsonError.code =
			err.context.translationKey || err.translationKey || jsonError.code;
		jsonError.message = err.message;
		if (err.context.error) {
			err = err.context.error;
		} else {
			break;
		}
	}

	if (err instanceof ZodError) {
		message = i18next.t("CAPTCHA.PARSE_ERROR");
		statusMessage = message;
		if (typeof err.message === "object") {
			jsonError = err.message;
		} else {
			jsonError.message = JSON.parse(err.message);
		}
	}

	jsonError.code = jsonError.code || code;
	return { code, statusMessage, jsonError };
};
