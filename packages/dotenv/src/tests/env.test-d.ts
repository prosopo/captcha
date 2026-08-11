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

import { describe, expectTypeOf, it } from "vitest";
// Imported from the package entrypoint, not ../env.js: these assertions exist
// to pin what consumers actually receive, so a barrel that stops re-exporting
// something — or narrows it — must fail here.
import { getEnv, getEnvFile, loadEnv } from "../index.js";

describe("getEnv", () => {
	it("always yields a string, since it falls back to development", () => {
		// A `string | undefined` return would force every caller to handle an
		// absent NODE_ENV that this function has already defaulted away.
		expectTypeOf(getEnv).returns.toEqualTypeOf<string>();
	});

	it("takes no arguments: it reads process.env directly", () => {
		expectTypeOf(getEnv).parameters.toEqualTypeOf<[]>();
	});
});

describe("loadEnv", () => {
	it("returns the resolved env path rather than void", () => {
		// Callers log and assert on which file was actually loaded.
		expectTypeOf(loadEnv).returns.toEqualTypeOf<string>();
	});

	it("is callable with no arguments at all", () => {
		expectTypeOf(loadEnv).toBeCallableWith();
	});

	it("takes every argument as optional, in order", () => {
		expectTypeOf(loadEnv).parameters.toEqualTypeOf<
			[
				(string | undefined)?,
				(string | undefined)?,
				(string | undefined)?,
				(string | undefined)?,
				(boolean | undefined)?,
			]
		>();
	});

	it("accepts a partially specified call", () => {
		expectTypeOf(loadEnv).toBeCallableWith("/root");
		expectTypeOf(loadEnv).toBeCallableWith("/root", ".env");
		expectTypeOf(loadEnv).toBeCallableWith(
			"/root",
			".env",
			"/root/.env",
			"test",
			true,
		);
	});

	it("keeps override a boolean, not a truthy anything", () => {
		// @ts-expect-error override is a boolean flag
		loadEnv("/root", ".env", "/root/.env", "test", "yes");
	});

	it("rejects a numeric root directory", () => {
		// @ts-expect-error rootDir is a path string
		loadEnv(1);
	});
});

describe("getEnvFile", () => {
	it("always resolves to a path string", () => {
		// It returns a best-effort path even when nothing was found on disk, so
		// the caller never has to handle undefined.
		expectTypeOf(getEnvFile).returns.toEqualTypeOf<string>();
	});

	it("is callable with no arguments, defaulting filename and search root", () => {
		expectTypeOf(getEnvFile).toBeCallableWith();
	});

	it("takes four optional positional arguments", () => {
		expectTypeOf(getEnvFile).parameters.toEqualTypeOf<
			[
				(string | undefined)?,
				(string | undefined)?,
				(string | undefined)?,
				(string | undefined)?,
			]
		>();
	});

	it("accepts an explicit nodeEnv override in last position", () => {
		expectTypeOf(getEnvFile).toBeCallableWith(
			"/root",
			".env",
			"/fallback",
			"production",
		);
	});

	it("rejects an extra argument", () => {
		// @ts-expect-error there is no fifth parameter
		getEnvFile("/root", ".env", "/fallback", "production", true);
	});
});
