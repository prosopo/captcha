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

import type { UnknownKeysParam, ZodObject, ZodRawShape, ZodTypeAny } from "zod";
import { ProsopoZodParseError } from "./error.js";

export const zodParse = <T, U extends ZodRawShape>(
	schema: ZodObject<U, UnknownKeysParam, ZodTypeAny, T, T>,
	value: unknown,
): T => {
	const result = schema.safeParse(value);
	if (result.success) {
		return result.data;
	}
	const msg = result.error.errors
		.map((error) => {
			const scope = error.path.join(".");
			if (scope) {
				return `${scope}: ${error.message}`;
			}
			return error.message;
		})
		.join("\n");
	throw new ProsopoZodParseError(`\n${msg}`, {
		context: {
			zodErrors: result.error.errors,
		},
	});
};
