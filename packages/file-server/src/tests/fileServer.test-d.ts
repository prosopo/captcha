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

import type http from "node:http";
import type { Express, RequestHandler } from "express";
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	type FetchFn,
	type FileServerDeps,
	type FileServerEnv,
	type Logger,
	type ResizeFn,
	createApp,
	createRemoteHandler,
	defaultDeps,
	getEnv,
	main,
	parseArray,
	sharpResize,
	toInt,
} from "../fileServer.js";

describe("FetchFn", () => {
	it("resolves to the global Response, not express's Response", () => {
		// express exports a `Response` type too, and importing it unqualified
		// here silently retargets this alias at the wrong one — the resulting
		// errors surface far away, at the call sites.
		expectTypeOf<FetchFn>().returns.toEqualTypeOf<
			Promise<globalThis.Response>
		>();
	});

	it("takes a single url string", () => {
		expectTypeOf<FetchFn>().parameters.toEqualTypeOf<[string]>();
	});

	it("is satisfied by a fetch-shaped function", () => {
		const stub: FetchFn = async (): Promise<globalThis.Response> =>
			new Response("body");
		expectTypeOf(stub).toMatchTypeOf<FetchFn>();
	});
});

describe("ResizeFn", () => {
	it("takes a buffer and a size, and resolves to a buffer", () => {
		expectTypeOf<ResizeFn>().parameters.toEqualTypeOf<[Buffer, number]>();
		expectTypeOf<ResizeFn>().returns.toEqualTypeOf<Promise<Buffer>>();
	});

	it("is satisfied by the sharp-backed implementation", () => {
		// The default dep depends on this holding.
		expectTypeOf(sharpResize).toEqualTypeOf<ResizeFn>();
	});

	it("rejects a resize that returns the wrong payload", () => {
		// @ts-expect-error must resolve to a Buffer
		const bad: ResizeFn = async (): Promise<string> => "not a buffer";
		expectTypeOf(bad).toEqualTypeOf<ResizeFn>();
	});
});

describe("Logger", () => {
	it("accepts the console methods the server actually uses", () => {
		expectTypeOf<Logger>().toHaveProperty("info");
		expectTypeOf<Logger>().toHaveProperty("warn");
		expectTypeOf<Logger>().toHaveProperty("error");
	});

	it("takes variadic unknown arguments so call sites are not constrained", () => {
		expectTypeOf<Logger["warn"]>().parameters.toEqualTypeOf<unknown[]>();
	});

	it("is satisfied by the real console", () => {
		// defaultDeps passes console straight through.
		expectTypeOf(console).toMatchTypeOf<Logger>();
	});

	it("does not require a debug method", () => {
		const minimal: Logger = {
			info: (): void => {},
			warn: (): void => {},
			error: (): void => {},
		};
		expectTypeOf(minimal).toMatchTypeOf<Logger>();
	});
});

describe("FileServerEnv", () => {
	it("keeps the port loose, since it is never coerced", () => {
		// getEnv passes the raw env value to listen() untouched.
		expectTypeOf<FileServerEnv["port"]>().toEqualTypeOf<string | number>();
	});

	it("models an absent resize as undefined rather than zero", () => {
		expectTypeOf<FileServerEnv["resize"]>().toEqualTypeOf<number | undefined>();
	});

	it("always yields arrays for paths and remotes", () => {
		// Callers iterate these without a null check.
		expectTypeOf<FileServerEnv["paths"]>().toEqualTypeOf<string[]>();
		expectTypeOf<FileServerEnv["remotes"]>().toEqualTypeOf<string[]>();
	});

	it("requires every field", () => {
		// @ts-expect-error a partial env is not a FileServerEnv
		assertType<FileServerEnv>({ port: 3000 });
	});
});

describe("FileServerDeps", () => {
	it("carries exactly the three injected collaborators", () => {
		expectTypeOf<keyof FileServerDeps>().toEqualTypeOf<
			"logger" | "fetch" | "resize"
		>();
	});

	it("is produced whole by defaultDeps", () => {
		expectTypeOf(defaultDeps).returns.toEqualTypeOf<FileServerDeps>();
		expectTypeOf(defaultDeps).parameters.toEqualTypeOf<[]>();
	});
});

describe("parseArray", () => {
	it("always returns a string array, never a bare string", () => {
		expectTypeOf(parseArray).returns.toEqualTypeOf<string[]>();
		expectTypeOf(parseArray).parameters.toEqualTypeOf<[string]>();
	});
});

describe("toInt", () => {
	it("accepts the shapes an env value can arrive as", () => {
		expectTypeOf(toInt).parameters.toEqualTypeOf<
			[string | number | undefined]
		>();
	});

	it("returns undefined rather than NaN for unparseable input", () => {
		// NaN is a number, so a `number` return would hide the failure case.
		expectTypeOf(toInt).returns.toEqualTypeOf<number | undefined>();
	});
});

describe("getEnv", () => {
	it("takes an optional env object", () => {
		expectTypeOf(getEnv).toBeCallableWith();
		expectTypeOf(getEnv).toBeCallableWith({ PROSOPO_FILE_SERVER_PORT: "1" });
	});

	it("returns a fully resolved config", () => {
		expectTypeOf(getEnv).returns.toEqualTypeOf<FileServerEnv>();
	});
});

describe("createRemoteHandler", () => {
	it("returns something express can mount directly", () => {
		expectTypeOf(createRemoteHandler).returns.toEqualTypeOf<RequestHandler>();
	});

	it("requires both the env and the deps", () => {
		expectTypeOf(createRemoteHandler).parameters.toEqualTypeOf<
			[FileServerEnv, FileServerDeps]
		>();
	});
});

describe("createApp", () => {
	it("returns an express app", () => {
		expectTypeOf(createApp).returns.toEqualTypeOf<Express>();
	});
});

describe("main", () => {
	it("resolves to the server so callers can shut it down", () => {
		// Returning void would leave tests and callers no way to close it.
		expectTypeOf(main).returns.toEqualTypeOf<Promise<http.Server>>();
	});

	it("takes optional deps, defaulting to the real ones", () => {
		expectTypeOf(main).toBeCallableWith();
		expectTypeOf(main).parameters.toEqualTypeOf<
			[(FileServerDeps | undefined)?]
		>();
	});

	it("rejects a partial deps object", () => {
		// @ts-expect-error all three collaborators are required
		main({ logger: console });
	});
});
