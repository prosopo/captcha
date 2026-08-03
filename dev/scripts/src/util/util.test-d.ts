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
import type { Logger } from "@prosopo/logger";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { ExecOutput } from "./exec.js";
import {
	exec,
	extractReferrersFromLogs,
	findEnvFiles,
	updateDemoHTMLFiles,
	updateEnvFiles,
} from "./index.js";

declare const logger: Logger;

describe("ExecOutput", () => {
	it("carries the captured streams and the exit code", () => {
		expectTypeOf<ExecOutput>().toExtend<{
			stdout: string;
			stderr: string;
			code: number | null;
		}>();
	});

	it("models a signalled process, which has no exit code", () => {
		expectTypeOf<ExecOutput["code"]>().toEqualTypeOf<number | null>();
	});
});

describe("exec", () => {
	it("takes a command and optional flags", () => {
		expectTypeOf(exec).toBeCallableWith("ls");
		expectTypeOf(exec).toBeCallableWith("ls", {});
		expectTypeOf(exec).toBeCallableWith("ls", { pipe: false });
		expectTypeOf(exec).toBeCallableWith("ls", { printCmd: false });
	});

	it("resolves to the output object", () => {
		expectTypeOf(exec).returns.resolves.toExtend<ExecOutput>();
	});

	it("rejects a non-string command", () => {
		// @ts-expect-error a command must be a string
		assertType(exec(1));
	});

	it("rejects an unknown option", () => {
		// @ts-expect-error `quiet` is not an option
		assertType(exec("ls", { quiet: true }));
	});
});

describe("env helpers", () => {
	it("finds env files, optionally scoped to a directory", () => {
		expectTypeOf(findEnvFiles).toBeCallableWith(logger);
		expectTypeOf(findEnvFiles).toBeCallableWith(logger, "/tmp");
		expectTypeOf(findEnvFiles).returns.resolves.toEqualTypeOf<string[]>();
	});

	it("updates env files from a list of variable names", () => {
		expectTypeOf(updateEnvFiles).toBeCallableWith(["A"], "1", logger);
		expectTypeOf(updateEnvFiles).toBeCallableWith(["A"], "1", logger, "/tmp");
		expectTypeOf(updateEnvFiles).returns.resolves.toEqualTypeOf<void>();
	});

	it("requires a logger", () => {
		// @ts-expect-error the logger is not optional
		assertType(updateEnvFiles(["A"], "1"));
	});

	it("updates demo html from a list of regular expressions", () => {
		expectTypeOf(updateDemoHTMLFiles).toBeCallableWith([/a/], "1", logger);
		expectTypeOf(updateDemoHTMLFiles).returns.resolves.toEqualTypeOf<void>();
	});

	it("rejects plain strings in place of matchers", () => {
		// @ts-expect-error matchers are regular expressions, not strings
		assertType(updateDemoHTMLFiles(["a"], "1", logger));
	});
});

describe("extractReferrersFromLogs", () => {
	it("maps log text to a single joined string", () => {
		expectTypeOf(extractReferrersFromLogs).toBeCallableWith("");
		expectTypeOf(extractReferrersFromLogs).returns.toEqualTypeOf<string>();
	});
});
