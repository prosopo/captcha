import dotenv from "dotenv";
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
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "vitest";
import { getEnv } from "../index.js";

vi.mock("dotenv", () => ({
	default: {
		config: vi.fn(),
	},
}));

describe("getEnv", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return default values when no env vars are set", () => {
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.port).toBe(3000);
		expect(result.paths).toEqual([]);
		expect(result.resize).toBeUndefined();
		expect(result.remotes).toEqual([]);
		expect(result.logLevel).toBe("info");
		expect(dotenv.config).toHaveBeenCalledWith({ path: ".env" });
	});

	it("should use NODE_ENV to determine env file path", () => {
		process.env.NODE_ENV = "test";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;

		getEnv();

		expect(dotenv.config).toHaveBeenCalledWith({ path: ".env.test" });
	});

	it("should parse PROSOPO_FILE_SERVER_PORT as number", () => {
		process.env.PROSOPO_FILE_SERVER_PORT = "8080";
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.port).toBe("8080");
	});

	it("should parse PROSOPO_FILE_SERVER_PATHS as JSON array", () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = '["/path1", "/path2"]';
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.paths).toEqual(["/path1", "/path2"]);
	});

	it("should parse PROSOPO_FILE_SERVER_PATHS as single string when not JSON", () => {
		process.env.PROSOPO_FILE_SERVER_PATHS = "/single/path";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.paths).toEqual(["/single/path"]);
	});

	it("should parse PROSOPO_FILE_SERVER_RESIZE as integer", () => {
		process.env.PROSOPO_FILE_SERVER_RESIZE = "128";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.resize).toBe(128);
	});

	it("should return undefined for resize when PROSOPO_FILE_SERVER_RESIZE is not set", () => {
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.resize).toBeUndefined();
	});

	it("should return undefined for resize when PROSOPO_FILE_SERVER_RESIZE is invalid", () => {
		process.env.PROSOPO_FILE_SERVER_RESIZE = "invalid";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		// The code uses `|| undefined` which means NaN || undefined = undefined
		expect(result.resize).toBeUndefined();
	});

	it("should parse PROSOPO_FILE_SERVER_REMOTES as JSON array", () => {
		process.env.PROSOPO_FILE_SERVER_REMOTES =
			'["http://remote1", "http://remote2"]';
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.remotes).toEqual(["http://remote1", "http://remote2"]);
	});

	it("should parse PROSOPO_FILE_SERVER_REMOTES as single string when not JSON", () => {
		process.env.PROSOPO_FILE_SERVER_REMOTES = "http://single-remote";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.remotes).toEqual(["http://single-remote"]);
	});

	it("should parse PROSOPO_LOG_LEVEL", () => {
		process.env.PROSOPO_LOG_LEVEL = "debug";
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();

		expect(result.logLevel).toBe("debug");
	});

	it("should have correct return type", () => {
		process.env.PROSOPO_FILE_SERVER_PORT = undefined;
		process.env.PROSOPO_FILE_SERVER_PATHS = undefined;
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_FILE_SERVER_REMOTES = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		const result = getEnv();
		expect(result.port).toBeDefined();
		expect(result.paths).toBeDefined();
		expect(result.remotes).toBeDefined();
		expect(result.logLevel).toBeDefined();
		expectTypeOf(result.resize).toEqualTypeOf<number | undefined>();
	});
});
