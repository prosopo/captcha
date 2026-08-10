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

import type { IncomingHttpHeaders } from "node:http";
import { ProsopoApiError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { KeyringPair } from "@prosopo/types";
import type { JWT } from "@prosopo/util-crypto";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	authMiddleware,
	verifySignature,
} from "../../../middlewares/authMiddleware.js";
import { type NextCapture, captureNext } from "../testDoubles.js";

/**
 * Everything this middleware protects is behind a single decision: call next()
 * or answer 401. It must never fall through to the handler when a token is
 * absent, malformed, or verified by neither key — including when verification
 * itself throws.
 */

type Verify = (jwt: JWT) => { isValid: boolean };

/** A pair that only implements the parts the middleware actually calls. */
const pairThat = (verify: Verify): KeyringPair =>
	({
		jwtVerify: vi.fn<Verify>(verify),
		address: "5Test",
		publicKey: new Uint8Array([1, 2, 3]),
		verify: vi.fn<
			(message: string, signature: Uint8Array, key: Uint8Array) => boolean
		>(() => true),
	}) as unknown as KeyringPair;

const accepts = (): KeyringPair => pairThat(() => ({ isValid: true }));
const rejects = (): KeyringPair => pairThat(() => ({ isValid: false }));
const explodes = (): KeyringPair =>
	pairThat(() => {
		throw new Error("verifier unavailable");
	});

interface Harness {
	req: Request;
	res: Response;
	next: NextCapture;
	status: ReturnType<typeof vi.fn<(code: number) => Response>>;
	json: ReturnType<typeof vi.fn<(body: unknown) => Response>>;
	logged: ReturnType<typeof vi.fn<(entry: () => unknown) => void>>;
}

const build = (headers: IncomingHttpHeaders = {}): Harness => {
	const json = vi.fn<(body: unknown) => Response>();
	const status = vi.fn<(code: number) => Response>();
	const res = { status, json } as unknown as Response;
	status.mockReturnValue(res);

	const logged = vi.fn<(entry: () => unknown) => void>();
	const req = {
		headers,
		logger: { error: logged } as unknown as Logger,
	} as unknown as Request;

	return { req, res, next: captureNext(), status, json, logged };
};

const bearer = (token: string): IncomingHttpHeaders => ({
	authorization: `Bearer ${token}`,
});

let harness: Harness;

beforeEach(() => {
	harness = build(bearer("token-1"));
});

const run = async (
	pair: KeyringPair | undefined,
	authAccount?: KeyringPair | undefined,
): Promise<void> => {
	await authMiddleware(pair, authAccount)(
		harness.req,
		harness.res,
		harness.next.fn,
	);
};

describe("a token one of the keys accepts", () => {
	test("passes the request through on the auth account", async () => {
		await run(rejects(), accepts());
		expect(harness.next.calls).toHaveLength(1);
		expect(harness.status).not.toHaveBeenCalled();
	});

	test("passes the request through on the provider pair", async () => {
		await run(accepts(), rejects());
		expect(harness.next.calls).toHaveLength(1);
	});

	test("does not consult the provider pair once the auth account accepts", async () => {
		// Short-circuiting matters: the second verify is a signature check and
		// there is no reason to pay for it twice.
		const pair = accepts();
		await run(pair, accepts());
		expect(pair.jwtVerify).not.toHaveBeenCalled();
	});

	test("works when only the provider pair is configured", async () => {
		await run(accepts(), undefined);
		expect(harness.next.calls).toHaveLength(1);
	});

	test("works when only the auth account is configured", async () => {
		await run(undefined, accepts());
		expect(harness.next.calls).toHaveLength(1);
	});

	test("hands the verifier the token without its Bearer prefix", async () => {
		const pair = accepts();
		await run(pair, undefined);
		expect(pair.jwtVerify).toHaveBeenCalledWith("token-1");
	});
});

describe("a token neither key accepts", () => {
	beforeEach(async () => {
		await run(rejects(), rejects());
	});

	test("is answered 401 and never reaches the handler", () => {
		expect(harness.status).toHaveBeenCalledWith(401);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("is answered with an error body carrying the 401 code", () => {
		const body = harness.json.mock.calls[0]?.[0] as { error: ProsopoApiError };
		expect(body.error.context?.code).toBe(401);
	});
});

describe("a request with no usable credentials", () => {
	test("no configured keys at all is rejected, not allowed through", async () => {
		// A misconfigured provider must fail closed.
		await run(undefined, undefined);
		expect(harness.status).toHaveBeenCalledWith(401);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("a missing Authorization header is rejected", async () => {
		harness = build({});
		await run(accepts(), accepts());
		expect(harness.status).toHaveBeenCalledWith(401);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("an Authorization header that is not a string is rejected", async () => {
		// Node hands back an array for a repeated header; verifying that would
		// throw deeper in, so it is refused here.
		harness = build({
			authorization: ["Bearer a", "Bearer b"] as unknown as string,
		});
		await run(accepts(), accepts());
		expect(harness.status).toHaveBeenCalledWith(401);
	});

	test("an empty Authorization header is rejected", async () => {
		harness = build({ authorization: "" });
		await run(accepts(), accepts());
		expect(harness.status).toHaveBeenCalledWith(401);
	});

	test("a Bearer prefix with no token after it is rejected", async () => {
		harness = build({ authorization: "Bearer " });
		await run(accepts(), accepts());
		expect(harness.status).toHaveBeenCalledWith(401);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("the verifier is never reached for a malformed header", async () => {
		harness = build({});
		const pair = accepts();
		await run(pair, undefined);
		expect(pair.jwtVerify).not.toHaveBeenCalled();
	});

	test("a header rejection is logged", async () => {
		harness = build({});
		await run(accepts(), undefined);
		expect(harness.logged).toHaveBeenCalledTimes(1);
	});
});

describe("header handling quirks worth pinning down", () => {
	test("a bare token with no Bearer prefix is accepted as the token", async () => {
		// The prefix is stripped rather than required, so a client that omits it
		// still authenticates. Recorded so a change here is deliberate.
		harness = build({ authorization: "token-1" });
		const pair = accepts();
		await run(pair, undefined);
		expect(pair.jwtVerify).toHaveBeenCalledWith("token-1");
		expect(harness.next.calls).toHaveLength(1);
	});

	test("a capitalised Authorization key is read as well as the lowercase one", async () => {
		// Node normalises real inbound header names to lowercase, so only the
		// second lookup fires in production — but both are honoured, which is
		// what lets a hand-built request object work in a test or a shim.
		harness = build({ Authorization: "Bearer token-1" } as IncomingHttpHeaders);
		const pair = accepts();
		await run(pair, undefined);
		expect(pair.jwtVerify).toHaveBeenCalledWith("token-1");
		expect(harness.next.calls).toHaveLength(1);
	});

	test("a Bearer prefix appearing inside the token is also stripped", async () => {
		// replace() is unanchored, so it removes the first occurrence wherever it
		// sits rather than only at the front.
		harness = build({ authorization: "abcBearer xyz" });
		const pair = accepts();
		await run(pair, undefined);
		expect(pair.jwtVerify).toHaveBeenCalledWith("abcxyz");
	});
});

describe("a verifier that throws", () => {
	test("is answered 401 rather than crashing the request", async () => {
		// A key backend being unavailable must not turn into a 500 or an
		// unhandled rejection.
		await run(explodes(), undefined);
		expect(harness.status).toHaveBeenCalledWith(401);
		expect(harness.next.calls).toHaveLength(0);
	});

	test("is logged against the request logger", async () => {
		await run(explodes(), undefined);
		expect(harness.logged).toHaveBeenCalledTimes(1);
		const entry = harness.logged.mock.calls[0]?.[0] as () => {
			msg: string;
			err: unknown;
		};
		expect(entry().msg).toBe("Auth Middleware Error");
	});

	test("a throwing auth account does not fall through to the provider pair", async () => {
		// The throw escapes the whole chain, so a working second key cannot
		// rescue the request.
		const pair = accepts();
		await run(pair, explodes());
		expect(pair.jwtVerify).not.toHaveBeenCalled();
		expect(harness.next.calls).toHaveLength(0);
	});

	test("does not resolve before it has answered", async () => {
		const middleware = authMiddleware(explodes(), undefined);
		await middleware(harness.req, harness.res, harness.next.fn);
		expect(harness.json).toHaveBeenCalledTimes(1);
	});
});

describe("verifySignature", () => {
	const message = "sign me";
	const signature = "0x0102";

	test("returns quietly when the pair verifies the signature", () => {
		const pair = pairThat(() => ({ isValid: true }));
		expect(() => verifySignature(signature, message, pair)).not.toThrow();
	});

	test("passes the decoded signature bytes to the pair", () => {
		const pair = pairThat(() => ({ isValid: true }));
		verifySignature(signature, message, pair);
		expect(pair.verify).toHaveBeenCalledWith(
			message,
			new Uint8Array([1, 2]),
			pair.publicKey,
		);
	});

	test("throws a 401 error when verification fails", () => {
		const pair = pairThat(() => ({ isValid: true }));
		vi.mocked(pair.verify).mockReturnValue(false);
		try {
			verifySignature(signature, message, pair);
			expect.unreachable("verifySignature should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ProsopoApiError);
			expect((error as ProsopoApiError).context?.code).toBe(401);
		}
	});

	test("reports which account and message failed", () => {
		// Without the account in the context a failure is untraceable across the
		// several keys a provider holds.
		const pair = pairThat(() => ({ isValid: true }));
		vi.mocked(pair.verify).mockReturnValue(false);
		try {
			verifySignature(signature, message, pair);
			expect.unreachable("verifySignature should have thrown");
		} catch (error) {
			const context = (error as ProsopoApiError).context;
			expect(context?.account).toBe("5Test");
			expect(context?.message).toBe(message);
			expect(context?.signature).toBe(signature);
		}
	});

	test("a non-hex signature is decoded to garbage rather than rejected", () => {
		// hexToU8a is lenient: it silently produces bytes for input that is not
		// hex at all. Nothing here validates the shape, so a malformed signature
		// reaches the pair and fails there instead of being refused up front.
		const pair = pairThat(() => ({ isValid: true }));
		vi.mocked(pair.verify).mockReturnValue(false);
		expect(() => verifySignature("not hex", message, pair)).toThrow(
			ProsopoApiError,
		);
		expect(pair.verify).toHaveBeenCalledTimes(1);
	});

	test("an empty message is still passed through to the pair", () => {
		// Nothing guards against it, so an empty message verifies or fails purely
		// on the pair's answer rather than being rejected up front.
		const pair = pairThat(() => ({ isValid: true }));
		verifySignature(signature, "", pair);
		expect(pair.verify).toHaveBeenCalledWith(
			"",
			new Uint8Array([1, 2]),
			pair.publicKey,
		);
	});
});
