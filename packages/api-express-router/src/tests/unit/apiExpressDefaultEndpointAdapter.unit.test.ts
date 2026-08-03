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

import {
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import { ProsopoApiError } from "@prosopo/common";
import { LogLevel, type Logger } from "@prosopo/logger";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type ZodType, z } from "zod";
import { ApiExpressDefaultEndpointAdapter } from "../../endpointAdapter/apiExpressDefaultEndpointAdapter.js";
import { type NextCapture, captureNext } from "./testDoubles.js";

/**
 * The adapter is the only place request bodies are validated and the only place
 * an endpoint's throw is turned into a response, so the split matters: a bad
 * body must reach the error handler through next(), while a failure inside the
 * endpoint must be answered directly with a 500.
 */

interface Harness {
	adapter: ApiExpressDefaultEndpointAdapter;
	request: Request;
	response: Response;
	next: NextCapture;
	logger: Logger;
	json: ReturnType<typeof vi.fn<(body: unknown) => Response>>;
	status: ReturnType<typeof vi.fn<(code: number) => Response>>;
	send: ReturnType<typeof vi.fn<(body: unknown) => Response>>;
	logged: ReturnType<typeof vi.fn<(entry: () => unknown) => void>>;
}

const build = (body: unknown = {}, errorStatusCode = 500): Harness => {
	const logged = vi.fn<(entry: () => unknown) => void>();
	const logger = {
		error: logged,
		info: vi.fn<(entry: () => unknown) => void>(),
		debug: vi.fn<(entry: () => unknown) => void>(),
		warn: vi.fn<(entry: () => unknown) => void>(),
	} as unknown as Logger;

	const json = vi.fn<(payload: unknown) => Response>();
	const send = vi.fn<(payload: unknown) => Response>();
	const status = vi.fn<(code: number) => Response>();
	const response = { json, send, status } as unknown as Response;
	status.mockReturnValue(response);

	return {
		adapter: new ApiExpressDefaultEndpointAdapter(
			LogLevel.enum.info,
			errorStatusCode,
		),
		request: { body, logger } as unknown as Request,
		response,
		next: captureNext(),
		logger,
		json,
		status,
		send,
		logged,
	};
};

const endpoint = (
	schema: ZodType | undefined,
	process: ApiEndpoint<ZodType | undefined>["processRequest"] = async () => ({
		status: ApiEndpointResponseStatus.SUCCESS,
	}),
): ApiEndpoint<ZodType | undefined> => ({
	getRequestArgsSchema: () => schema,
	processRequest:
		vi.fn<ApiEndpoint<ZodType | undefined>["processRequest"]>(process),
});

let harness: Harness;

beforeEach(() => {
	harness = build();
});

describe("a request the endpoint accepts", () => {
	test("parses the body and passes the parsed value on", async () => {
		harness = build({ count: "5" });
		const schema = z.object({ count: z.coerce.number() });
		const target = endpoint(schema);

		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);

		// The parsed value, not the raw body: coercion has to survive the trip.
		expect(target.processRequest).toHaveBeenCalledWith(
			{ count: 5 },
			harness.logger,
		);
	});

	test("passes undefined args when the endpoint declares no schema", async () => {
		const target = endpoint(undefined);
		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(target.processRequest).toHaveBeenCalledWith(
			undefined,
			harness.logger,
		);
	});

	test("hands the endpoint the request's own logger", async () => {
		const target = endpoint(undefined);
		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(vi.mocked(target.processRequest).mock.calls[0]?.[1]).toBe(
			harness.logger,
		);
	});

	test("answers with the endpoint's response as JSON", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => ({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { value: 1 },
			})),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.json).toHaveBeenCalledWith({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { value: 1 },
		});
		expect(harness.next.calls).toHaveLength(0);
	});

	test("stringifies bigints, which res.json() cannot serialise", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => ({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { big: 10n },
			})),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.json).toHaveBeenCalledWith({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { big: "10" },
		});
	});

	test("passes an empty data payload straight through", async () => {
		// Nothing coerces an empty result into a body, so the client sees
		// exactly what the endpoint returned.
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => ({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {},
			})),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.json).toHaveBeenCalledWith({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {},
		});
	});

	test("an absent request body is still handed to the schema", async () => {
		// Express only populates req.body when a body parser is mounted, so an
		// endpoint whose schema tolerates undefined has to keep working.
		harness.request.body = undefined;
		const schema = z.object({ a: z.string() }).optional();
		const target = endpoint(schema);
		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(target.processRequest).toHaveBeenCalledWith(
			undefined,
			harness.logger,
		);
		expect(harness.json).toHaveBeenCalledWith({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
	});
});

describe("a body the schema rejects", () => {
	test("goes to the error handler rather than being answered here", async () => {
		harness = build({ count: "not a number" });
		const target = endpoint(z.object({ count: z.number() }));

		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);

		expect(harness.next.calls).toHaveLength(1);
		expect(harness.json).not.toHaveBeenCalled();
		expect(target.processRequest).not.toHaveBeenCalled();
	});

	test("is reported as a 400 parse error carrying the cause", async () => {
		harness = build({ count: "not a number" });
		await harness.adapter.handleRequest(
			endpoint(z.object({ count: z.number() })),
			harness.request,
			harness.response,
			harness.next.fn,
		);

		const [forwarded] = harness.next.calls[0] ?? [];
		expect(forwarded).toBeInstanceOf(ProsopoApiError);
		const error = forwarded as ProsopoApiError;
		expect(error.context?.code).toBe(400);
		expect(error.context?.error).toBeDefined();
	});

	test("a schema that throws something other than a ZodError is treated the same", async () => {
		// getRequestArgsSchema().parse is only known to throw; nothing depends
		// on it being a ZodError, so a custom schema cannot escape the 400.
		const schema = {
			parse: () => {
				throw new Error("custom validator exploded");
			},
		} as unknown as ZodType;

		await harness.adapter.handleRequest(
			endpoint(schema),
			harness.request,
			harness.response,
			harness.next.fn,
		);

		expect(harness.next.calls).toHaveLength(1);
		expect(harness.next.calls[0]?.[0]).toBeInstanceOf(ProsopoApiError);
	});

	test("an endpoint that fails while building its schema is caught too", async () => {
		// getRequestArgsSchema() is called inside the same try as parse(), so a
		// broken schema factory is reported as a bad request rather than
		// escaping handleRequest as an unhandled rejection.
		const target: ApiEndpoint<ZodType | undefined> = {
			getRequestArgsSchema: () => {
				throw new Error("schema construction failed");
			},
			processRequest:
				vi.fn<ApiEndpoint<ZodType | undefined>["processRequest"]>(),
		};

		await harness.adapter.handleRequest(
			target,
			harness.request,
			harness.response,
			harness.next.fn,
		);

		expect(harness.next.calls[0]?.[0]).toBeInstanceOf(ProsopoApiError);
		expect(target.processRequest).not.toHaveBeenCalled();
	});
});

describe("an endpoint that fails", () => {
	test("is answered with a 500 and a generic message", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw new Error("database down");
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);

		expect(harness.status).toHaveBeenCalledWith(500);
		expect(harness.send).toHaveBeenCalledWith(
			"An internal server error occurred.",
		);
	});

	test("does not leak the failure's message to the client", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw new Error("connection string: postgres://user:secret@host");
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(String(harness.send.mock.calls[0]?.[0])).not.toContain("secret");
	});

	test("logs the failure against the request's logger", async () => {
		const failure = new Error("database down");
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw failure;
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);

		expect(harness.logged).toHaveBeenCalledTimes(1);
		const entry = harness.logged.mock.calls[0]?.[0];
		expect(entry?.()).toEqual({ err: failure });
	});

	test("does not also call next(), so the error handler is not double-run", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw new Error("database down");
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("ignores the configured errorStatusCode and always answers 500", async () => {
		// The constructor takes an errorStatusCode that the handler never reads.
		// Pinned here so the behaviour is visible rather than assumed; the fix
		// is in flight separately.
		harness = build({}, 503);
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw new Error("unavailable");
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.status).toHaveBeenCalledWith(500);
		expect(harness.status).not.toHaveBeenCalledWith(503);
	});

	test("a rejection with a non-Error value is handled just the same", async () => {
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => {
				throw "a bare string";
			}),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.status).toHaveBeenCalledWith(500);
		expect(harness.logged).toHaveBeenCalledTimes(1);
	});

	test("a failure while serialising the response is caught too", async () => {
		// stringifyBigInts walks the response, so a getter that throws lands in
		// the same catch as an endpoint failure rather than escaping.
		const hostile: ApiEndpointResponse = {
			get status(): ApiEndpointResponseStatus {
				throw new Error("getter exploded");
			},
		};
		await harness.adapter.handleRequest(
			endpoint(undefined, async () => hostile),
			harness.request,
			harness.response,
			harness.next.fn,
		);
		expect(harness.status).toHaveBeenCalledWith(500);
	});
});
