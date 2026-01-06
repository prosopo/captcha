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
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("version", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	test("types", () => {
		// Verify version is a string
		import("./version.js").then((mod) => {
			const v: string = mod.version;
			expect(typeof v).toBe("string");
		});
	});

	describe("version value", () => {
		test("returns environment variable value when PROSOPO_PACKAGE_VERSION is set", async () => {
			const testVersion = "1.2.3";
			process.env.PROSOPO_PACKAGE_VERSION = testVersion;
			vi.resetModules();
			const { version } = await import("./version.js");
			expect(version).toBe(testVersion);
		});

		test("returns 'dev' when PROSOPO_PACKAGE_VERSION is not set", async () => {
			process.env.PROSOPO_PACKAGE_VERSION = undefined;
			vi.resetModules();
			const { version } = await import("./version.js");
			expect(version).toBe("dev");
		});

		test("returns 'dev' when PROSOPO_PACKAGE_VERSION is empty string", async () => {
			process.env.PROSOPO_PACKAGE_VERSION = "";
			vi.resetModules();
			const { version } = await import("./version.js");
			expect(version).toBe("dev");
		});

		test("handles version with prerelease tags", async () => {
			const testVersion = "2.0.0-alpha.1";
			process.env.PROSOPO_PACKAGE_VERSION = testVersion;
			vi.resetModules();
			const { version } = await import("./version.js");
			expect(version).toBe(testVersion);
		});

		test("handles version with build metadata", async () => {
			const testVersion = "3.0.0+build.123";
			process.env.PROSOPO_PACKAGE_VERSION = testVersion;
			vi.resetModules();
			const { version } = await import("./version.js");
			expect(version).toBe(testVersion);
		});
	});
});
