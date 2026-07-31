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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Languages } from "../translations.js";

// The module reads process.env at import time, so every expectation about the
// debug flag has to re-import it under a fresh module registry.
type SharedOptions =
	typeof import("../i18SharedOptions.js")["i18nSharedOptions"];

const loadOptions = async (): Promise<SharedOptions> => {
	vi.resetModules();
	const { i18nSharedOptions } = await import("../i18SharedOptions.js");
	return i18nSharedOptions;
};

const originalLogLevel = process.env.PROSOPO_LOG_LEVEL;

beforeEach(() => {
	Reflect.deleteProperty(process.env, "PROSOPO_LOG_LEVEL");
});

afterEach(() => {
	vi.doUnmock("../process.js");
	vi.resetModules();
	if (originalLogLevel === undefined) {
		Reflect.deleteProperty(process.env, "PROSOPO_LOG_LEVEL");
	} else {
		process.env.PROSOPO_LOG_LEVEL = originalLogLevel;
	}
});

describe("i18nSharedOptions", () => {
	test("falls back to English", async () => {
		const options = await loadOptions();
		expect(options.fallbackLng).toBe("en");
	});

	test("uses the single translation namespace", async () => {
		const options = await loadOptions();
		expect(options.namespace).toBe("translation");
	});

	test("supports exactly the declared language codes", async () => {
		const options = await loadOptions();
		expect(new Set(options.supportedLngs)).toEqual(
			new Set(Object.values(Languages)),
		);
	});

	// With this false, i18next will not silently serve `en` resources for a
	// request for `en-GB`. Flipping it would quietly change which file a
	// regional locale resolves to.
	test("does not accept non-explicit regional variants", async () => {
		const options = await loadOptions();
		expect(options.nonExplicitSupportedLngs).toBe(false);
	});

	describe("debug flag", () => {
		test("is off when PROSOPO_LOG_LEVEL is unset", async () => {
			const options = await loadOptions();
			expect(options.debug).toBe(false);
		});

		test("is on only for the exact value 'debug'", async () => {
			process.env.PROSOPO_LOG_LEVEL = "debug";
			expect((await loadOptions()).debug).toBe(true);
		});

		test("is off for any other log level", async () => {
			for (const level of ["info", "warn", "error", "trace", ""]) {
				process.env.PROSOPO_LOG_LEVEL = level;
				expect((await loadOptions()).debug, level).toBe(false);
			}
		});

		test("is case sensitive — 'DEBUG' does not enable it", async () => {
			process.env.PROSOPO_LOG_LEVEL = "DEBUG";
			expect((await loadOptions()).debug).toBe(false);
		});
	});

	// This module is reached transitively from browser bundles, where `process`
	// is absent or partial, so both degraded shapes have to load cleanly.
	//
	// The `process` read goes through getProcess() precisely so it can be mocked
	// here. Stubbing the global instead is not viable: vitest itself calls
	// process.memoryUsage() between suites, so removing the real global fails
	// the run rather than the module under test.
	describe("browser runtime, where process may be absent or partial", () => {
		const mockProcess = (value: NodeJS.Process | undefined): void => {
			vi.resetModules();
			vi.doMock("../process.js", () => ({
				getProcess: (): NodeJS.Process | undefined => value,
			}));
		};

		test("loads when there is no process at all", async () => {
			mockProcess(undefined);
			const { i18nSharedOptions } = await import("../i18SharedOptions.js");
			expect(i18nSharedOptions.debug).toBe(false);
			expect(i18nSharedOptions.fallbackLng).toBe("en");
		});

		test("loads when process exists but exposes no env", async () => {
			// Prototype-chained off the real process so the shape stays honest;
			// only `env` is shadowed away.
			const partial: NodeJS.Process = Object.create(process);
			Reflect.defineProperty(partial, "env", {
				value: undefined,
				configurable: true,
			});
			mockProcess(partial);

			const { i18nSharedOptions } = await import("../i18SharedOptions.js");
			expect(i18nSharedOptions.debug).toBe(false);
			expect(i18nSharedOptions.fallbackLng).toBe("en");
		});

		test("still reads the log level when process is present", async () => {
			process.env.PROSOPO_LOG_LEVEL = "debug";
			mockProcess(process);
			const { i18nSharedOptions } = await import("../i18SharedOptions.js");
			expect(i18nSharedOptions.debug).toBe(true);
		});
	});
});
