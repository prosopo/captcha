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

import { describe, expect, expectTypeOf, test } from "vitest";
import { HttpError } from "./HttpError.js";

describe("HttpError", () => {
	test("creates error with correct properties", () => {
		const error = new HttpError(404, "Not Found", "https://example.com/api");

		expect(error.status).toBe(404);
		expect(error.statusText).toBe("Not Found");
		expect(error.url).toBe("https://example.com/api");
		expect(error.name).toBe("HttpError");
		expect(error.message).toBe(
			"HTTP error! status: 404 (Not Found) for URL: https://example.com/api",
		);
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(HttpError);
	});

	test("creates error with different status codes", () => {
		const error500 = new HttpError(
			500,
			"Internal Server Error",
			"https://example.com/api",
		);
		expect(error500.status).toBe(500);
		expect(error500.statusText).toBe("Internal Server Error");

		const error401 = new HttpError(
			401,
			"Unauthorized",
			"https://example.com/api",
		);
		expect(error401.status).toBe(401);
		expect(error401.statusText).toBe("Unauthorized");
	});

	test("error message format is correct", () => {
		const error = new HttpError(
			403,
			"Forbidden",
			"https://api.example.com/v1/users",
		);
		expect(error.message).toContain("403");
		expect(error.message).toContain("Forbidden");
		expect(error.message).toContain("https://api.example.com/v1/users");
	});

	test("type checking - properties are correctly typed", () => {
		const error = new HttpError(404, "Not Found", "https://example.com/api");

		expectTypeOf(error.status).toMatchTypeOf<number>();
		expectTypeOf(error.statusText).toMatchTypeOf<string>();
		expectTypeOf(error.url).toMatchTypeOf<string>();
		expectTypeOf(error.message).toMatchTypeOf<string>();
		expectTypeOf(error.name).toMatchTypeOf<string>();
	});

	test("type checking - HttpError extends Error", () => {
		const error = new HttpError(404, "Not Found", "https://example.com/api");

		expectTypeOf(error).toMatchTypeOf<Error>();
		expectTypeOf(error).toMatchTypeOf<HttpError>();
	});
});
