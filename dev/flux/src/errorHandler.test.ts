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
import { ProsopoApiError } from "@prosopo/common";
import { describe, expect, it } from "vitest";
import { errorHandler, streamToJson } from "./errorHandler.js";

interface Payload {
	status: string;
	data: string;
}

const streamOf = (text: string): ReadableStream<Uint8Array> =>
	new ReadableStream<Uint8Array>({
		start(controller: ReadableStreamDefaultController<Uint8Array>): void {
			controller.enqueue(new TextEncoder().encode(text));
			controller.close();
		},
	});

// The thrown error carries a translation key as its message, so assertions
// look at the context instead.
const rejection = async (
	promise: Promise<unknown>,
): Promise<ProsopoApiError> => {
	try {
		await promise;
	} catch (error) {
		if (error instanceof ProsopoApiError) {
			return error;
		}
		throw error;
	}
	throw new Error("expected the call to reject");
};

const responseOf = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), { status });

describe("streamToJson", () => {
	it("parses a json object off the stream", async () => {
		expect(await streamToJson(streamOf('{"a":1}'))).toEqual({ a: 1 });
	});

	it("parses a json array off the stream", async () => {
		expect(await streamToJson(streamOf("[1,2]"))).toEqual([1, 2]);
	});

	it("rejects on malformed json", async () => {
		await expect(streamToJson(streamOf("not json"))).rejects.toThrow();
	});

	it("rejects on an empty stream", async () => {
		await expect(streamToJson(streamOf(""))).rejects.toThrow();
	});
});

describe("errorHandler", () => {
	it("returns the parsed body for a successful response", async () => {
		const data = await errorHandler<Payload>(
			responseOf({ status: "success", data: "phrase" }),
		);
		expect(data).toEqual({ status: "success", data: "phrase" });
	});

	it("throws for a non-2xx response", async () => {
		await expect(errorHandler(responseOf({}, 500))).rejects.toThrow(
			ProsopoApiError,
		);
	});

	it("reports the http status in the thrown error's context", async () => {
		const error = await rejection(errorHandler(responseOf({}, 404)));
		expect(error.context?.code).toBe(404);
		expect(String(error.context?.error)).toContain("404");
	});

	it("throws when the body reports an application level error", async () => {
		const error = await rejection(
			errorHandler(responseOf({ status: "error", data: { message: "nope" } })),
		);
		expect(String(error.context?.error)).toContain("nope");
	});

	it("treats a 2xx with no body as an empty result", async () => {
		expect(await errorHandler(new Response(null, { status: 204 }))).toEqual({});
	});

	it("throws before reading the body of a failed response", async () => {
		// a 4xx whose body is unparseable must still surface as a status error
		const error = await rejection(
			errorHandler(new Response("not json", { status: 400 })),
		);
		expect(error.context?.code).toBe(400);
	});

	it("rejects when a successful response carries an unparseable body", async () => {
		await expect(
			errorHandler(new Response("not json", { status: 200 })),
		).rejects.toThrow();
	});

	it("accepts a body with no status field", async () => {
		expect(await errorHandler(responseOf({ data: "x" }))).toEqual({
			data: "x",
		});
	});

	it("treats a 299 as successful", async () => {
		expect(await errorHandler(responseOf({ a: 1 }, 299))).toEqual({ a: 1 });
	});

	it("treats a 300 as a failure", async () => {
		await expect(errorHandler(responseOf({}, 300))).rejects.toThrow(
			ProsopoApiError,
		);
	});
});
