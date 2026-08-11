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

// @vitest-environment jsdom

import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { LogRecord } from "../logger.js";
import { getLogger, setGlobalDirectives } from "../logger.js";

// `inBrowser` is resolved once at module load, so this whole file runs under
// jsdom to exercise the dev-tools branch of print() (objects are passed to the
// console verbatim rather than being serialised to JSON).

type ConsoleMock = Mock<(...args: unknown[]) => void>;

let info: ConsoleMock;
let error: ConsoleMock;

beforeEach(() => {
	setGlobalDirectives("");
	info = vi.fn<(...args: unknown[]) => void>();
	error = vi.fn<(...args: unknown[]) => void>();
	vi.spyOn(console, "info").mockImplementation(info);
	vi.spyOn(console, "error").mockImplementation(error);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("NativeLogger in a browser", () => {
	it("logs the message and the record separately so dev tools can expand it", () => {
		getLogger("info", "scope").info((): LogRecord => ({ msg: "hello" }));

		expect(info).toHaveBeenCalledWith(
			"hello",
			expect.objectContaining({ msg: "hello", scope: "scope", level: "info" }),
		);
	});

	it("falls back to the error message when there is no msg", () => {
		getLogger("info", "scope").error(
			(): LogRecord => ({ err: new Error("boom") }),
		);

		expect(error).toHaveBeenCalledWith(
			"boom",
			expect.objectContaining({ err: "boom" }),
		);
	});

	it("logs the bare record when there is neither a message nor an error", () => {
		getLogger("info", "scope").info((): LogRecord => ({ data: { a: 1 } }));

		expect(info).toHaveBeenCalledWith(
			expect.objectContaining({ data: { a: 1 }, scope: "scope" }),
		);
		expect(info.mock.calls[0]).toHaveLength(1);
	});

	it("does not serialise the record to a string", () => {
		getLogger("info", "scope").info((): LogRecord => ({ msg: "hello" }));

		expect(typeof info.mock.calls[0]?.[1]).toBe("object");
	});
});
