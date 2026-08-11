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
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	type ApiNext,
	createTestHandler,
	createVerifyHandler,
} from "../api.js";
import {
	NOT_VERIFIED_MESSAGE,
	TEST_COMMITMENT_ID,
	VERIFIED_MESSAGE,
} from "../verify.js";
import {
	type DepsMock,
	type ResponseMock,
	createBody,
	createDeps,
	createOutput,
	createRequest,
	createResponse,
} from "./fixtures.js";

let mocks: DepsMock;
let response: ResponseMock;
let next: ApiNext;
let nextCalls: unknown[];

beforeEach(() => {
	mocks = createDeps();
	response = createResponse();
	nextCalls = [];
	next = (error: unknown): void => {
		nextCalls.push(error);
	};
});

const errorCode = (error: unknown): unknown =>
	error instanceof ProsopoApiError ? error.context?.code : undefined;

describe("the verify handler", () => {
	test("approves a token carrying a fixture", async () => {
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		expect(response.json).toHaveBeenCalledWith({
			status: `translated:${VERIFIED_MESSAGE}`,
			verified: true,
			commitmentId: TEST_COMMITMENT_ID,
		});
		expect(nextCalls).toEqual([]);
	});

	test("rejects a token carrying nothing known", async () => {
		mocks.decodeToken.mockReturnValue(
			createOutput({ user: "nobody", dapp: "nowhere" }),
		);
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		expect(response.json).toHaveBeenCalledWith({
			status: `translated:${NOT_VERIFIED_MESSAGE}`,
			verified: false,
		});
	});

	test("a rejection response has no commitmentId key at all", async () => {
		// Not even set to undefined: JSON.stringify would drop it, but a caller
		// reading the object directly would see the key and could misread it.
		mocks.decodeToken.mockReturnValue(
			createOutput({ user: "nobody", dapp: "nowhere" }),
		);
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		const body = response.json.mock.calls[0]?.[0];
		expect(body).toBeDefined();
		expect(Object.keys(body as object)).toEqual(["status", "verified"]);
	});

	test("decodes the token that was sent, not some other field", async () => {
		await createVerifyHandler(mocks.deps)(
			createRequest({ body: createBody({ token: "0xabc123" }) }),
			response.res,
			next,
		);
		expect(mocks.decodeToken).toHaveBeenCalledWith("0xabc123");
	});

	test("translates the status message through the request", async () => {
		const t = vi.fn<(key: string) => string>(() => "Vérifié");
		await createVerifyHandler(mocks.deps)(
			createRequest({ t }),
			response.res,
			next,
		);
		expect(t).toHaveBeenCalledWith(VERIFIED_MESSAGE);
		expect(response.json).toHaveBeenCalledWith(
			expect.objectContaining({ status: "Vérifié" }),
		);
	});

	describe("a body that does not parse", () => {
		const badBodies: Array<[string, unknown]> = [
			["missing entirely", undefined],
			["not an object", "token=0x1"],
			["null", null],
			["empty", {}],
			["missing the token", createBody({ token: undefined })],
			["missing the signature", createBody({ dappSignature: undefined })],
			["a token that is not hex", createBody({ token: "deadbeef" })],
			["a token that is the empty string", createBody({ token: "" })],
			["a token of the wrong type", createBody({ token: 42 })],
			[
				"a token longer than INPUT_LIMITS.TOKEN",
				createBody({ token: `0x${"a".repeat(131072)}` }),
			],
		];

		for (const [description, body] of badBodies) {
			test(`is a 400 when it is ${description}`, async () => {
				await createVerifyHandler(mocks.deps)(
					createRequest({ body }),
					response.res,
					next,
				);
				expect(nextCalls).toHaveLength(1);
				expect(nextCalls[0]).toBeInstanceOf(ProsopoApiError);
				expect(errorCode(nextCalls[0])).toBe(400);
				expect(response.json).not.toHaveBeenCalled();
			});
		}

		test("never reaches the decoder", async () => {
			await createVerifyHandler(mocks.deps)(
				createRequest({ body: {} }),
				response.res,
				next,
			);
			expect(mocks.decodeToken).not.toHaveBeenCalled();
		});
	});

	test("a token that cannot be decoded is a 500", async () => {
		mocks.decodeToken.mockImplementation(() => {
			throw new Error("bad codec");
		});
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		expect(errorCode(nextCalls[0])).toBe(500);
		expect(response.json).not.toHaveBeenCalled();
	});

	test("a failure inside the translator is a 500, not a crash", async () => {
		// req.t is added by the i18n middleware; if it is not mounted the handler
		// must still answer the request rather than reject.
		await createVerifyHandler(mocks.deps)(
			createRequest({
				t: (): string => {
					throw new Error("no i18n middleware");
				},
			}),
			response.res,
			next,
		);
		expect(errorCode(nextCalls[0])).toBe(500);
	});

	test("calls next exactly once, never alongside a response", async () => {
		mocks.decodeToken.mockImplementation(() => {
			throw new Error("bad codec");
		});
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		expect(nextCalls).toHaveLength(1);
		expect(response.json).not.toHaveBeenCalled();
	});

	test("resolves rather than rejecting, whatever happens", async () => {
		// An express handler that rejects becomes an unhandled rejection: the
		// request hangs until the client times out.
		mocks.decodeToken.mockImplementation(() => {
			throw new Error("bad codec");
		});
		await expect(
			createVerifyHandler(mocks.deps)(createRequest(), response.res, next),
		).resolves.toBeUndefined();
	});

	test("a thrown non-Error is still reported as a 500", async () => {
		mocks.decodeToken.mockImplementation(() => {
			throw "not an error";
		});
		await createVerifyHandler(mocks.deps)(createRequest(), response.res, next);
		expect(errorCode(nextCalls[0])).toBe(500);
	});
});

describe("the test handler", () => {
	test("returns the fingerprint and the user agent", async () => {
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(response.json).toHaveBeenCalledWith({
			ja4: "t13d1516h2_8daaf6152771_b0da82dd1658",
			ua: "Mozilla/5.0",
		});
	});

	test("stores the fingerprint against the user agent", async () => {
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.database.addOrUpdateJA4Record).toHaveBeenCalledWith({
			ja4_fingerprint: "t13d1516h2_8daaf6152771_b0da82dd1658",
			user_agent_string: "Mozilla/5.0",
		});
	});

	test("connects before writing and closes afterwards", async () => {
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.database.connect).toHaveBeenCalledOnce();
		expect(mocks.database.close).toHaveBeenCalledOnce();
		expect(mocks.database.connect.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.database.addOrUpdateJA4Record.mock.invocationCallOrder[0] ?? 0,
		);
	});

	test("a request with no user agent stores the empty string", async () => {
		// The unique index covers (fingerprint, user agent), so undefined would
		// make every anonymous client collide on a null key.
		await createTestHandler(mocks.deps)(
			createRequest({ headers: {} }),
			response.res,
		);
		expect(mocks.database.addOrUpdateJA4Record).toHaveBeenCalledWith(
			expect.objectContaining({ user_agent_string: "" }),
		);
	});

	test("an empty user agent header is stored as the empty string", async () => {
		await createTestHandler(mocks.deps)(
			createRequest({ headers: { "user-agent": "" } }),
			response.res,
		);
		expect(mocks.database.addOrUpdateJA4Record).toHaveBeenCalledWith(
			expect.objectContaining({ user_agent_string: "" }),
		);
	});

	test("closes the connection even when the write fails", async () => {
		// This is the leak: close used to sit after the write, so a failing write
		// left the connection open for the life of the process.
		mocks.database.addOrUpdateJA4Record.mockRejectedValue(
			new Error("duplicate key"),
		);
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.database.close).toHaveBeenCalledOnce();
		expect(response.status).toHaveBeenCalledWith(500);
	});

	test("closes the connection even when connecting fails", async () => {
		mocks.database.connect.mockRejectedValue(new Error("mongo is down"));
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.database.close).toHaveBeenCalledOnce();
		expect(mocks.database.addOrUpdateJA4Record).not.toHaveBeenCalled();
		expect(response.status).toHaveBeenCalledWith(500);
	});

	test("does not open a connection when fingerprinting fails", async () => {
		mocks.getJA4.mockRejectedValue(new Error("no ClientHello"));
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.database.connect).not.toHaveBeenCalled();
		expect(mocks.database.close).not.toHaveBeenCalled();
		expect(response.status).toHaveBeenCalledWith(500);
	});

	test("a failure to close is itself reported, not swallowed", async () => {
		mocks.database.close.mockRejectedValue(new Error("close failed"));
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).not.toHaveBeenCalled();
	});

	test("sends a body with the 500, so the client sees a reason", async () => {
		mocks.getJA4.mockRejectedValue(new Error("no ClientHello"));
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(response.send).toHaveBeenCalledWith(
			"Failed to record the caller's JA4 fingerprint.",
		);
	});

	test("resolves rather than rejecting when the database is down", async () => {
		mocks.database.connect.mockRejectedValue(new Error("mongo is down"));
		await expect(
			createTestHandler(mocks.deps)(createRequest(), response.res),
		).resolves.toBeUndefined();
	});

	test("a thrown non-Error is still a 500", async () => {
		mocks.getJA4.mockRejectedValue("not an error");
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(response.status).toHaveBeenCalledWith(500);
	});

	test("passes the logger to the fingerprinter", async () => {
		await createTestHandler(mocks.deps)(createRequest(), response.res);
		expect(mocks.getJA4).toHaveBeenCalledWith(
			expect.objectContaining({ "user-agent": "Mozilla/5.0" }),
			mocks.deps.logger,
		);
	});

	test("a duplicate write does not stop the next request working", async () => {
		mocks.database.addOrUpdateJA4Record.mockRejectedValueOnce(
			new Error("duplicate key"),
		);
		const handler = createTestHandler(mocks.deps);
		await handler(createRequest(), response.res);
		const second = createResponse();
		await handler(createRequest(), second.res);
		expect(second.json).toHaveBeenCalledOnce();
	});
});
