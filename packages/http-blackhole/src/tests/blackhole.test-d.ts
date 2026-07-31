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
import type net from "node:net";
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	DEFAULT_PORT,
	type Exit,
	InvalidPortError,
	type Logger,
	MAX_PORT,
	type RecordRequest,
	createBlackholeServer,
	createRequestLog,
	createShutdown,
	describeRequest,
	handleRequest,
	resolvePort,
} from "../blackhole.js";

describe("port constants", () => {
	it("are plain numbers, usable directly by listen()", () => {
		expectTypeOf(DEFAULT_PORT).toEqualTypeOf<number>();
		expectTypeOf(MAX_PORT).toEqualTypeOf<number>();
	});
});

describe("Logger", () => {
	it("takes a single string, so callers must format before logging", () => {
		// Deliberately narrower than console.log: a variadic sink would let a
		// caller pass objects that the capture in tests could not compare.
		expectTypeOf<Logger["log"]>().parameters.toEqualTypeOf<[string]>();
		expectTypeOf<Logger["log"]>().returns.toEqualTypeOf<void>();
	});

	it("is satisfied by the real console", () => {
		// The entrypoint passes console straight in.
		expectTypeOf(console).toMatchTypeOf<Logger>();
	});

	it("rejects a sink that only takes objects", () => {
		// @ts-expect-error log must accept a string
		const bad: Logger = { log: (_message: { text: string }): void => {} };
		assertType<Logger>(bad);
	});
});

describe("Exit", () => {
	it("takes an exit code and returns void, not never", () => {
		// process.exit is typed `never`; using that here would make every line
		// after an exit() call unreachable in the eyes of the compiler, which is
		// wrong for the injected test double that simply records the code.
		expectTypeOf<Exit>().parameters.toEqualTypeOf<[number]>();
		expectTypeOf<Exit>().returns.toEqualTypeOf<void>();
	});

	it("accepts a recording double", () => {
		const codes: number[] = [];
		const exit: Exit = (code: number): void => {
			codes.push(code);
		};
		expectTypeOf(exit).toEqualTypeOf<Exit>();
	});

	it("requires the code, so no caller can exit ambiguously", () => {
		const exit: Exit = (): void => {};
		// @ts-expect-error the exit code is mandatory
		exit();
	});
});

describe("InvalidPortError", () => {
	it("is an Error subclass so existing catch blocks keep working", () => {
		expectTypeOf<InvalidPortError>().toMatchTypeOf<Error>();
	});

	it("is constructed from the offending raw value", () => {
		expectTypeOf(InvalidPortError).toBeConstructibleWith("not-a-port");
		// @ts-expect-error the offending value is required
		new InvalidPortError();
	});
});

describe("resolvePort", () => {
	it("accepts an unset env var without the caller narrowing first", () => {
		// process.env.PORT is `string | undefined`; requiring a narrow here would
		// push the fallback decision back out to every call site.
		expectTypeOf(resolvePort).parameters.toEqualTypeOf<[string | undefined]>();
		expectTypeOf(resolvePort).toBeCallableWith(undefined);
	});

	it("always returns a number, never a string passthrough", () => {
		expectTypeOf(resolvePort).returns.toEqualTypeOf<number>();
	});

	it("rejects a number, which would bypass validation entirely", () => {
		// @ts-expect-error only raw env strings are accepted
		resolvePort(8080);
	});
});

describe("describeRequest", () => {
	it("maps a request to a string, tolerating unparsed fields", () => {
		expectTypeOf(describeRequest).parameters.toEqualTypeOf<
			[http.IncomingMessage]
		>();
		expectTypeOf(describeRequest).returns.toEqualTypeOf<string>();
	});
});

describe("handleRequest", () => {
	it("returns void: never responding is the point of the package", () => {
		expectTypeOf(handleRequest).returns.toEqualTypeOf<void>();
	});

	it("takes the recorder as optional", () => {
		// createBlackholeServer supplies it; direct callers should not have to.
		expectTypeOf(handleRequest).parameters.toEqualTypeOf<
			[http.IncomingMessage, Logger, (RecordRequest | undefined)?]
		>();
	});

	it("takes a recorder callback, not a map that a Map could impersonate", () => {
		// A parameter typed WeakMap would accept a strongly-keyed Map, since Map
		// is structurally assignable to it — the retention bug would compile
		// cleanly. A function signature admits no such substitution.
		const req = {} as http.IncomingMessage;
		// @ts-expect-error a map is no longer accepted here
		handleRequest(req, { log: (): void => {} }, new Map<net.Socket, string>());
	});
});

describe("RecordRequest", () => {
	it("takes the socket and the formatted description", () => {
		expectTypeOf<RecordRequest>().parameters.toEqualTypeOf<
			[net.Socket, string]
		>();
		expectTypeOf<RecordRequest>().returns.toEqualTypeOf<void>();
	});
});

describe("createRequestLog", () => {
	it("returns a WeakMap, the only thing that actually guarantees weakness", () => {
		// Weakness is a property of the class, not of the type, so this is the
		// single construction site the runtime test asserts against.
		expectTypeOf(createRequestLog).returns.toEqualTypeOf<
			WeakMap<net.Socket, string>
		>();
		expectTypeOf(createRequestLog).parameters.toEqualTypeOf<[]>();
	});
});

describe("createBlackholeServer", () => {
	it("returns a real http.Server so the caller controls listening", () => {
		expectTypeOf(createBlackholeServer).returns.toEqualTypeOf<http.Server>();
		expectTypeOf(createBlackholeServer).parameters.toEqualTypeOf<[Logger]>();
	});
});

describe("createShutdown", () => {
	it("returns a zero-argument handler, matching the signal listener shape", () => {
		expectTypeOf(createShutdown).returns.toEqualTypeOf<() => void>();
		expectTypeOf(createShutdown).returns.parameters.toEqualTypeOf<[]>();
	});

	it("requires the server, logger and exit together", () => {
		expectTypeOf(createShutdown).parameters.toEqualTypeOf<
			[http.Server, Logger, Exit]
		>();
	});

	it("produces something process.on can be handed directly", () => {
		const handler: () => void = createShutdown(
			createBlackholeServer({ log: (): void => {} }),
			{ log: (): void => {} },
			(): void => {},
		);
		expectTypeOf(handler).toMatchTypeOf<NodeJS.SignalsListener>();
	});
});
