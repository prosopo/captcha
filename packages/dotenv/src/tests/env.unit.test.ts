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

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Imported through the package barrel rather than ../env.js directly, so the
// public export surface is exercised too.
import { getEnv, getEnvFile, loadEnv } from "../index.js";

// Testing strategy
// ----------------
// getEnvFile/loadEnv are filesystem-discovery functions: their entire contract
// is "walk the directory tree and find/read a file". Mocking node:fs would mean
// re-implementing directory-walk semantics inside the mock and asserting against
// that re-implementation, which tests the mock rather than the code. So the happy
// paths and boundary conditions run against a real temp directory tree, and real
// dotenv, for full fidelity.
//
// Mocks (vi.spyOn) are used only for the cases a real filesystem cannot produce
// on demand: a read that fails after the existence check passed (permissions
// revoked, file deleted mid-call, network mount dropping), and dotenv itself
// throwing. That is the "service sporadically unavailable" class of failure.

// A workspace-root package.json is the sentinel that stops the upward search.
const WORKSPACE_PKG_JSON: string = JSON.stringify({
	name: "@prosopo/captcha-private",
});

describe("dotenv/env", () => {
	let tmpRoot: string;
	let envBackup: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Real temp tree, unique per test, so tests cannot see each other's files.
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-dotenv-test-"));
		// Snapshot the whole environment: loadEnv mutates process.env by design.
		envBackup = { ...process.env };
	});

	afterEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
		// Restore in place — reassigning process.env does not propagate in Node.
		for (const key of Object.keys(process.env)) {
			if (!(key in envBackup)) delete process.env[key];
		}
		Object.assign(process.env, envBackup);
		vi.restoreAllMocks();
	});

	/** Create a directory (recursively) inside the temp tree and return its path. */
	const mkdir = (...segments: string[]): string => {
		const dir = path.join(tmpRoot, ...segments);
		fs.mkdirSync(dir, { recursive: true });
		return dir;
	};

	/** Write a file, creating parent directories as needed. */
	const writeFile = (dir: string, name: string, contents: string): string => {
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, name);
		fs.writeFileSync(file, contents);
		return file;
	};

	describe("getEnv", () => {
		it("returns 'development' when NODE_ENV is not set", () => {
			process.env.NODE_ENV = undefined;
			// biome-ignore lint/performance/noDelete: must be absent, not undefined
			delete process.env.NODE_ENV;

			expect(getEnv()).toBe("development");
		});

		// Empty string is falsy, so it takes the default branch rather than
		// returning "". Worth pinning: an explicitly-blank NODE_ENV in a shell
		// script behaves identically to an unset one.
		it("returns 'development' when NODE_ENV is the empty string", () => {
			process.env.NODE_ENV = "";

			expect(getEnv()).toBe("development");
		});

		it("returns NODE_ENV unchanged when it is already word characters only", () => {
			process.env.NODE_ENV = "test";

			expect(getEnv()).toBe("test");
		});

		it("strips non-word characters", () => {
			process.env.NODE_ENV = "pro-duction!";

			expect(getEnv()).toBe("production");
		});

		it("preserves digits and underscores, which are word characters", () => {
			process.env.NODE_ENV = "staging_2";

			expect(getEnv()).toBe("staging_2");
		});

		it("strips whitespace, including a value that is only whitespace", () => {
			process.env.NODE_ENV = " test ";
			expect(getEnv()).toBe("test");

			process.env.NODE_ENV = "   ";
			expect(getEnv()).toBe("");
		});

		it("strips non-ASCII characters", () => {
			process.env.NODE_ENV = "tëst";

			expect(getEnv()).toBe("tst");
		});

		// Documents a sharp edge rather than endorsing it: a NODE_ENV made
		// entirely of punctuation sanitises down to "", which is truthy-checked
		// upstream but produces the filename ".env." — see the getEnvFile test
		// "builds a trailing-dot filename when the sanitised env is empty".
		it("returns the empty string when NODE_ENV is entirely non-word characters", () => {
			process.env.NODE_ENV = "!!!";

			expect(getEnv()).toBe("");
		});
	});

	describe("getEnvFile", () => {
		it("finds the env file directly in rootDir", () => {
			const expected = writeFile(tmpRoot, ".env.test", "");

			expect(getEnvFile(tmpRoot, ".env", undefined, "test")).toBe(expected);
		});

		it("walks up the tree to find the env file in an ancestor", () => {
			const expected = writeFile(tmpRoot, ".env.test", "");
			const deep = mkdir("a", "b", "c");

			expect(getEnvFile(deep, ".env", undefined, "test")).toBe(expected);
		});

		it("returns the nearest match when the file exists at several levels", () => {
			writeFile(tmpRoot, ".env.test", "");
			const nearestDir = mkdir("a", "b");
			const nearest = writeFile(nearestDir, ".env.test", "");
			const start = mkdir("a", "b", "c");

			expect(getEnvFile(start, ".env", undefined, "test")).toBe(nearest);
		});

		it("respects a custom filename", () => {
			const expected = writeFile(tmpRoot, "custom.test", "");

			expect(getEnvFile(tmpRoot, "custom", undefined, "test")).toBe(expected);
		});

		it("uses the explicit nodeEnv argument in preference to NODE_ENV", () => {
			process.env.NODE_ENV = "development";
			const expected = writeFile(tmpRoot, ".env.production", "");

			expect(getEnvFile(tmpRoot, ".env", undefined, "production")).toBe(
				expected,
			);
		});

		it("falls back to NODE_ENV when nodeEnv is the empty string", () => {
			// "" is falsy, so `nodeEnv || getEnv()` reaches for the environment.
			process.env.NODE_ENV = "staging";
			const expected = writeFile(tmpRoot, ".env.staging", "");

			expect(getEnvFile(tmpRoot, ".env", undefined, "")).toBe(expected);
		});

		it("falls back to NODE_ENV when nodeEnv is omitted", () => {
			process.env.NODE_ENV = "staging";
			const expected = writeFile(tmpRoot, ".env.staging", "");

			expect(getEnvFile(tmpRoot)).toBe(expected);
		});

		it("resolves a relative rootDir against the current working directory", () => {
			const cwd = process.cwd();
			const relative = path.relative(cwd, tmpRoot);
			const expected = writeFile(tmpRoot, ".env.test", "");

			expect(getEnvFile(relative, ".env", undefined, "test")).toBe(expected);
		});

		it("treats an empty rootDir as the current working directory", () => {
			// "" is falsy so path.resolve(".") is used. The search then walks up
			// from cwd; assert only that it terminates and yields an absolute path
			// for a filename that cannot exist anywhere.
			const result = getEnvFile("", ".env", undefined, "nonexistent-env-xyz");

			expect(path.isAbsolute(result)).toBe(true);
			expect(result.endsWith(".env.nonexistent-env-xyz")).toBe(true);
		});

		it("builds a trailing-dot filename when the sanitised env is empty", () => {
			process.env.NODE_ENV = "!!!";
			const expected = writeFile(tmpRoot, ".env.", "");

			expect(getEnvFile(tmpRoot)).toBe(expected);
		});

		describe("workspace root sentinel", () => {
			it("stops searching at the workspace-root package.json", () => {
				// The env file sits ABOVE the workspace root, so an unbounded search
				// would find it. The sentinel must prevent that.
				writeFile(tmpRoot, ".env.test", "");
				const workspaceRoot = mkdir("workspace");
				writeFile(workspaceRoot, "package.json", WORKSPACE_PKG_JSON);
				const start = mkdir("workspace", "packages", "thing");

				const result = getEnvFile(start, ".env", undefined, "test");

				// Search stopped at the workspace root, where no env file exists,
				// so the fallback (rootDir-based) path is returned.
				expect(result).toBe(path.join(start, ".env.test"));
				expect(fs.existsSync(result)).toBe(false);
			});

			it("keeps walking past a package.json belonging to another project", () => {
				const expected = writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("some-package");
				writeFile(
					intermediate,
					"package.json",
					JSON.stringify({ name: "@prosopo/dotenv" }),
				);
				const start = mkdir("some-package", "src");

				expect(getEnvFile(start, ".env", undefined, "test")).toBe(expected);
			});

			it("keeps walking past a package.json with no name field", () => {
				const expected = writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("nameless");
				writeFile(intermediate, "package.json", JSON.stringify({ version: 1 }));
				const start = mkdir("nameless", "src");

				expect(getEnvFile(start, ".env", undefined, "test")).toBe(expected);
			});

			it("keeps walking when package.json is valid JSON but not an object", () => {
				// JSON.parse("123") is a number; reading .name off it yields
				// undefined rather than throwing, so the walk continues.
				const expected = writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("weird");
				writeFile(intermediate, "package.json", "123");
				const start = mkdir("weird", "src");

				expect(getEnvFile(start, ".env", undefined, "test")).toBe(expected);
			});

			it("finds the env file at the workspace root itself", () => {
				// The sentinel breaks the loop, but the loop condition is checked
				// first, so a file sitting at the workspace root is still found.
				const workspaceRoot = mkdir("workspace");
				writeFile(workspaceRoot, "package.json", WORKSPACE_PKG_JSON);
				const expected = writeFile(workspaceRoot, ".env.test", "");
				const start = mkdir("workspace", "packages", "thing");

				expect(getEnvFile(start, ".env", undefined, "test")).toBe(expected);
			});
		});

		describe("depth limit", () => {
			it("gives up after ascending more than 10 levels", () => {
				// 14 levels deep with no env file and no package.json anywhere:
				// the only thing that can stop the walk is the level counter.
				const segments = Array.from({ length: 14 }, (_, i) => `d${i}`);
				const start = mkdir(...segments);

				const result = getEnvFile(start, ".env", undefined, "test");

				expect(result).toBe(path.join(start, ".env.test"));
			});

			it("still finds a file exactly 10 levels up", () => {
				// Boundary: the counter increments after the move, and the guard is
				// `> 10`, so 10 ancestors remain reachable.
				const segments = Array.from({ length: 10 }, (_, i) => `d${i}`);
				const expected = writeFile(tmpRoot, ".env.test", "");
				const start = mkdir(...segments);

				expect(getEnvFile(start, ".env", undefined, "test")).toBe(expected);
			});

			it("terminates at the filesystem root instead of looping forever", () => {
				// path.resolve("/", "..") is "/", so without the level counter this
				// would spin indefinitely. Use a filename that cannot exist.
				const result = getEnvFile(
					path.parse(tmpRoot).root,
					".env",
					undefined,
					"definitely-not-a-real-env-9f3a",
				);

				expect(result).toBe(
					path.join(
						path.parse(tmpRoot).root,
						".env.definitely-not-a-real-env-9f3a",
					),
				);
			});
		});

		describe("fallback path when nothing is found", () => {
			it("falls back to rootDir when rootDir was supplied", () => {
				const start = mkdir("a");

				expect(getEnvFile(start, ".env", "/some/other/place", "test")).toBe(
					path.join(start, ".env.test"),
				);
			});

			it("falls back to the filepath argument when rootDir is falsy", () => {
				// With rootDir empty the search starts at cwd; when it finds nothing
				// the `filepath` argument becomes the base of the returned path.
				const result = getEnvFile("", ".env", tmpRoot, "nonexistent-env-xyz");

				expect(result).toBe(path.join(tmpRoot, ".env.nonexistent-env-xyz"));
			});
		});

		describe("failure modes", () => {
			// These propagate out of getEnvFile uncaught. getEnvFile has no
			// try/catch and neither does loadEnv, so the exception surfaces at the
			// application entry point that called loadEnv — typically before any
			// logger is configured. Pinning the behaviour so a future change to
			// swallow-and-continue is a deliberate, visible decision.
			it("propagates a SyntaxError when an ancestor package.json is malformed", () => {
				writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("broken");
				writeFile(intermediate, "package.json", "{ not valid json");
				const start = mkdir("broken", "src");

				expect(() => getEnvFile(start, ".env", undefined, "test")).toThrow(
					SyntaxError,
				);
			});

			it("propagates a TypeError when an ancestor package.json contains null", () => {
				// JSON.parse("null") is null, and reading .name off null throws.
				writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("nullish");
				writeFile(intermediate, "package.json", "null");
				const start = mkdir("nullish", "src");

				expect(() => getEnvFile(start, ".env", undefined, "test")).toThrow(
					TypeError,
				);
			});

			it("propagates a read error when package.json vanishes after the existence check", () => {
				// Time-of-check/time-of-use: existsSync passes, then the read fails
				// (file deleted, permissions revoked, network mount dropped).
				writeFile(tmpRoot, ".env.test", "");
				const intermediate = mkdir("racy");
				writeFile(intermediate, "package.json", WORKSPACE_PKG_JSON);
				const start = mkdir("racy", "src");

				const readError = Object.assign(
					new Error("EACCES: permission denied"),
					{
						code: "EACCES",
					},
				);
				vi.spyOn(fs, "readFileSync").mockImplementation(() => {
					throw readError;
				});

				expect(() => getEnvFile(start, ".env", undefined, "test")).toThrow(
					readError,
				);
			});

			it("propagates an error thrown by the existence check itself", () => {
				const statError = Object.assign(new Error("EIO: i/o error"), {
					code: "EIO",
				});
				vi.spyOn(fs, "existsSync").mockImplementation(() => {
					throw statError;
				});

				expect(() => getEnvFile(tmpRoot, ".env", undefined, "test")).toThrow(
					statError,
				);
			});
		});
	});

	describe("loadEnv", () => {
		it("loads variables from the discovered file into process.env", () => {
			writeFile(tmpRoot, ".env.test", "PROSOPO_TEST_VALUE=hello\n");

			const returned = loadEnv(tmpRoot, ".env", undefined, "test");

			expect(returned).toBe(path.join(tmpRoot, ".env.test"));
			expect(process.env.PROSOPO_TEST_VALUE).toBe("hello");
		});

		it("loads multiple variables and ignores comments and blank lines", () => {
			writeFile(
				tmpRoot,
				".env.test",
				"# a comment\n\nPROSOPO_A=1\nPROSOPO_B=two\n",
			);

			loadEnv(tmpRoot, ".env", undefined, "test");

			expect(process.env.PROSOPO_A).toBe("1");
			expect(process.env.PROSOPO_B).toBe("two");
		});

		it("handles an empty env file without error", () => {
			// Length-zero input: nothing to parse, nothing should break.
			const expected = writeFile(tmpRoot, ".env.test", "");

			expect(loadEnv(tmpRoot, ".env", undefined, "test")).toBe(expected);
		});

		it("does not overwrite existing variables by default", () => {
			process.env.PROSOPO_TEST_VALUE = "original";
			writeFile(tmpRoot, ".env.test", "PROSOPO_TEST_VALUE=replacement\n");

			loadEnv(tmpRoot, ".env", undefined, "test");

			expect(process.env.PROSOPO_TEST_VALUE).toBe("original");
		});

		it("overwrites existing variables when override is true", () => {
			process.env.PROSOPO_TEST_VALUE = "original";
			writeFile(tmpRoot, ".env.test", "PROSOPO_TEST_VALUE=replacement\n");

			loadEnv(tmpRoot, ".env", undefined, "test", true);

			expect(process.env.PROSOPO_TEST_VALUE).toBe("replacement");
		});

		it("uses the explicit nodeEnv to choose which file to load", () => {
			process.env.NODE_ENV = "development";
			writeFile(tmpRoot, ".env.development", "PROSOPO_WHICH=development\n");
			writeFile(tmpRoot, ".env.production", "PROSOPO_WHICH=production\n");

			loadEnv(tmpRoot, ".env", undefined, "production");

			expect(process.env.PROSOPO_WHICH).toBe("production");
		});

		it("respects a custom filename", () => {
			writeFile(tmpRoot, "custom.test", "PROSOPO_CUSTOM=yes\n");

			const returned = loadEnv(tmpRoot, "custom", undefined, "test");

			expect(returned).toBe(path.join(tmpRoot, "custom.test"));
			expect(process.env.PROSOPO_CUSTOM).toBe("yes");
		});

		// Business-logic note: loadEnv returns a path unconditionally. When no
		// env file exists, dotenv.config reports the error on its return value —
		// which loadEnv discards — so the caller receives a plausible-looking path
		// to a file that was never read, and no indication that nothing loaded.
		// Callers that need to know must stat the returned path themselves.
		it("returns a path and stays silent when no env file exists", () => {
			const start = mkdir("empty");

			const returned = loadEnv(start, ".env", undefined, "nonexistent-env-xyz");

			expect(returned).toBe(path.join(start, ".env.nonexistent-env-xyz"));
			expect(fs.existsSync(returned)).toBe(false);
		});

		it("defaults to the current working directory when rootDir is omitted", () => {
			// Uses an env name that cannot exist so the search is guaranteed to
			// fail and nothing real is loaded into process.env.
			const returned = loadEnv(undefined, ".env", undefined, "nonexistent-xyz");

			expect(path.isAbsolute(returned)).toBe(true);
			expect(returned.endsWith(".env.nonexistent-xyz")).toBe(true);
		});

		it("propagates errors thrown during discovery", () => {
			const intermediate = mkdir("broken");
			writeFile(intermediate, "package.json", "{ not valid json");
			const start = mkdir("broken", "src");

			expect(() => loadEnv(start, ".env", undefined, "test")).toThrow(
				SyntaxError,
			);
		});

		// Business-logic note: this is a silent failure. dotenv.config catches the
		// read error internally and reports it on its return value (`{ error }`),
		// which loadEnv discards. So an unreadable env file — wrong permissions
		// after a deploy, a dropped network mount — produces no throw, no log, and
		// a returned path that looks exactly like success, while every variable the
		// application expects is missing. The first symptom is a downstream
		// "undefined config" error far from the real cause. Pinning the current
		// behaviour; making loadEnv inspect the result is a separate decision.
		it("silently ignores a read failure on the env file", () => {
			writeFile(tmpRoot, ".env.test", "PROSOPO_TEST_VALUE=hello\n");
			const readError = Object.assign(new Error("EACCES: permission denied"), {
				code: "EACCES",
			});
			vi.spyOn(fs, "readFileSync").mockImplementation(() => {
				throw readError;
			});

			const returned = loadEnv(tmpRoot, ".env", undefined, "test");

			// Reports the path as though the load succeeded...
			expect(returned).toBe(path.join(tmpRoot, ".env.test"));
			// ...but nothing was actually loaded.
			expect(process.env.PROSOPO_TEST_VALUE).toBeUndefined();
		});
	});

	// The logger.debug calls take a thunk that builds the log payload, and the
	// logger only invokes it when debug level is enabled. At the default level
	// those thunk bodies never run, so a mistake inside one (a bad property
	// access, a stale variable name) would only surface in production the moment
	// someone raised the log level. These tests run the module at debug level so
	// every payload builder is actually executed.
	//
	// The logger is constructed once at module load from PROSOPO_LOG_LEVEL, so
	// the level must be set before the module is imported — hence resetModules
	// plus a dynamic import rather than the top-level import used elsewhere.
	describe("debug logging", () => {
		const importAtDebugLevel = async (): Promise<
			typeof import("../index.js")
		> => {
			process.env.PROSOPO_LOG_LEVEL = "debug";
			vi.resetModules();
			return import("../index.js");
		};

		it("builds the search payload without throwing", async () => {
			const { getEnvFile: getEnvFileDebug } = await importAtDebugLevel();
			const expected = writeFile(tmpRoot, ".env.test", "");

			expect(getEnvFileDebug(tmpRoot, ".env", undefined, "test")).toBe(
				expected,
			);
		});

		it("builds the workspace-root payload without throwing", async () => {
			const { getEnvFile: getEnvFileDebug } = await importAtDebugLevel();
			const workspaceRoot = mkdir("workspace");
			writeFile(workspaceRoot, "package.json", WORKSPACE_PKG_JSON);
			const start = mkdir("workspace", "packages", "thing");

			expect(getEnvFileDebug(start, ".env", undefined, "test")).toBe(
				path.join(start, ".env.test"),
			);
		});

		it("builds the depth-limit payload without throwing", async () => {
			const { getEnvFile: getEnvFileDebug } = await importAtDebugLevel();
			const segments = Array.from({ length: 14 }, (_, i) => `d${i}`);
			const start = mkdir(...segments);

			expect(getEnvFileDebug(start, ".env", undefined, "test")).toBe(
				path.join(start, ".env.test"),
			);
		});

		it("builds the load payload without throwing", async () => {
			const { loadEnv: loadEnvDebug } = await importAtDebugLevel();
			const expected = writeFile(tmpRoot, ".env.test", "PROSOPO_DEBUG_V=1\n");

			expect(loadEnvDebug(tmpRoot, ".env", undefined, "test")).toBe(expected);
			expect(process.env.PROSOPO_DEBUG_V).toBe("1");
		});
	});
});
