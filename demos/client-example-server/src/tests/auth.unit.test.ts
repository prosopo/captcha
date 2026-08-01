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

import { CaptchaType, type ProcaptchaToken } from "@prosopo/types";
import type { NextFunction } from "express";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { isAuth, login, signup } from "../controllers/auth.js";
import {
	SECRET,
	SITE_KEY,
	VERIFY_ENDPOINT,
	connectionWith,
	pairWithAddress,
	request,
	responseStub,
	serverConfig,
	signupBody,
	userModel,
} from "./authHarness.js";

/**
 * The controllers derive keyring pairs and verify tokens against a provider.
 * Both are replaced here: deriving is deterministic but slow, and verifying
 * would need a live provider. Everything else — zod parsing, the mongoose
 * calls, the response codes — is the real thing.
 */
const mocks = vi.hoisted(() => ({
	// Maps a secret to the address the pair derived from it claims.
	addresses: new Map<string, string>(),
	isVerified: vi.fn(),
	constructions: [] as unknown[][],
}));

vi.mock("@prosopo/keyring", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/keyring")>();
	return {
		...actual,
		getPair: (secret: string) => ({
			address: mocks.addresses.get(secret) ?? `derived:${secret}`,
		}),
	};
});

vi.mock("@prosopo/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/server")>();
	return {
		...actual,
		ProsopoServer: class {
			constructor(...args: unknown[]) {
				mocks.constructions.push(args);
			}
			isVerified = mocks.isVerified;
		},
	};
});

const next: NextFunction = () => undefined;

const fetchMock =
	vi.fn<
		(input: string | URL | Request, init?: RequestInit) => Promise<Response>
	>();

beforeEach(() => {
	mocks.addresses.clear();
	mocks.addresses.set(SECRET, SITE_KEY);
	mocks.constructions.length = 0;
	mocks.isVerified.mockReset();
	mocks.isVerified.mockResolvedValue({ verified: true });
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ verified: true })));
	vi.stubGlobal("fetch", fetchMock);
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	Reflect.deleteProperty(process.env, "NODE_ENV");
	process.env.NODE_ENV = "test";
});

describe("signup", () => {
	test("creates the user once the captcha verifies", async () => {
		const { connection, model } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([200]);
		expect(res.bodies).toEqual([{ message: "user created" }]);
		const created = model.create.mock.calls[0]?.[0] as Record<string, string>;
		expect(created?.email).toBe("user@example.com");
		expect(created?.name).toBe("user");
		// The password is salted and hashed, never stored as typed.
		expect(created?.password).not.toBe("hunter2");
		expect(String(created?.password).startsWith("0x")).toBe(true);
		expect(created?.salt).toMatch(/^0x[0-9a-f]{64}$/);
	});

	test("salts every signup differently", async () => {
		const { connection, model } = connectionWith(userModel({}));
		for (let i = 0; i < 2; i++) {
			await signup(
				connection,
				serverConfig(),
				VERIFY_ENDPOINT,
				"local",
				request({ body: signupBody() }),
				responseStub().response,
				next,
			);
		}
		const [first, second] = model.create.mock.calls.map(
			(call) => (call[0] as Record<string, string>).salt,
		);
		expect(first).not.toBe(second);
	});

	test("rejects an email that is already registered, before verifying", async () => {
		const { connection, model } = connectionWith(
			userModel({ found: { password: "0xhash", salt: "0xsalt" } }),
		);
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([409]);
		expect(res.bodies).toEqual([{ message: "email already exists" }]);
		expect(mocks.isVerified).not.toHaveBeenCalled();
		expect(model.create).not.toHaveBeenCalled();
	});

	test("refuses a signup that failed the captcha", async () => {
		mocks.isVerified.mockResolvedValue({ verified: false });
		const { connection, model } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([
			{ message: "user has not completed a captcha", verified: false },
		]);
		expect(model.create).not.toHaveBeenCalled();
	});

	test("treats a non-boolean verification result as a failure", async () => {
		// The API path returns whatever JSON the endpoint sent, so `verified`
		// can be a string, or missing entirely.
		mocks.isVerified.mockResolvedValue({ verified: "true" });
		const { connection, model } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([401]);
		expect(model.create).not.toHaveBeenCalled();
	});

	test("reports a database write failure as a bad gateway", async () => {
		const { connection } = connectionWith(
			userModel({ createRejects: new Error("write concern failed") }),
		);
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([502]);
		expect(res.bodies).toEqual([{ message: "error while creating the user" }]);
	});

	test("reports a database read failure as a server error", async () => {
		const { connection } = connectionWith(
			userModel({ findOneRejects: new Error("mongo unavailable") }),
		);
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toEqual([{ message: "mongo unavailable" }]);
	});

	test("refuses to run without a site private key", async () => {
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig({}),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
		expect(mocks.isVerified).not.toHaveBeenCalled();
	});

	test("rejects a body that isn't a signup", async () => {
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody({ email: "not-an-email" }) }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("rejects a token that isn't a procaptcha token", async () => {
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody({ "procaptcha-response": "token" }) }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("falls back to a message when the failure carries none", async () => {
		const { connection } = connectionWith(
			userModel({ findOneRejects: new Error("") }),
		);
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.bodies).toEqual([{ message: "internal server error" }]);
	});

	test("passes the caller's IP to the verifier", async () => {
		const { connection } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({
				body: signupBody(),
				headers: { "x-client-ip": "203.0.113.9" },
			}),
			responseStub().response,
			next,
		);
		expect(mocks.isVerified).toHaveBeenCalledWith(
			"0xtoken",
			"203.0.113.9",
			"user@example.com",
		);
	});

	test("falls back to localhost when no IP header is present", async () => {
		const { connection } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			responseStub().response,
			next,
		);
		expect(mocks.isVerified).toHaveBeenCalledWith(
			"0xtoken",
			"127.0.0.1",
			"user@example.com",
		);
	});
});

describe("signup: matching the site key to a keyring pair", () => {
	test("uses the bare secret when it derives the site key", async () => {
		const { connection } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			responseStub().response,
			next,
		);
		expect(mocks.constructions[0]?.[1]).toEqual({ address: SITE_KEY });
	});

	test("tries the captcha-type suffixes when the bare secret doesn't match", async () => {
		mocks.addresses.clear();
		mocks.addresses.set(`${SECRET}//${CaptchaType.frictionless}`, SITE_KEY);
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([200]);
		// The suffixed secret is what gets sent for verification, not the base.
		const body: Record<string, string> = JSON.parse(
			String(fetchMock.mock.calls[0]?.[1]?.body),
		);
		expect(body.secret).toBe(`${SECRET}//${CaptchaType.frictionless}`);
	});

	test("gives up when no captcha type derives the site key", async () => {
		mocks.addresses.clear();
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies[0]).toMatchObject({ message: expect.any(String) });
		expect(mocks.isVerified).not.toHaveBeenCalled();
	});
});

describe("signup: verifying through the API endpoint", () => {
	test("posts the token and secret to the configured endpoint", async () => {
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({
				body: signupBody(),
				headers: { "x-client-ip": "203.0.113.9" },
			}),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([200]);
		expect(fetchMock.mock.calls[0]?.[0]).toBe(VERIFY_ENDPOINT);
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
		const body: Record<string, string> = JSON.parse(
			String(fetchMock.mock.calls[0]?.[1]?.body),
		);
		expect(body).toEqual({
			token: "0xtoken",
			secret: SECRET,
			email: "user@example.com",
			ip: "203.0.113.9",
		});
		expect(mocks.isVerified).not.toHaveBeenCalled();
	});

	test("withholds the IP in development", async () => {
		process.env.NODE_ENV = "development";
		const { connection } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({
				body: signupBody(),
				headers: { "x-client-ip": "203.0.113.9" },
			}),
			responseStub().response,
			next,
		);
		const body: Record<string, string> = JSON.parse(
			String(fetchMock.mock.calls[0]?.[1]?.body),
		);
		expect(body.ip).toBeUndefined();
	});

	test("refuses the signup when the endpoint says unverified", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ verified: false })),
		);
		const { connection, model } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([401]);
		expect(model.create).not.toHaveBeenCalled();
	});

	test("reports a verification endpoint that is unreachable", async () => {
		fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toEqual([{ message: "ECONNREFUSED" }]);
	});

	test("reports a verification endpoint that returns garbage", async () => {
		fetchMock.mockResolvedValue(new Response("<html>502</html>"));
		const { connection } = connectionWith(userModel({}));
		const res = responseStub();
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({ body: signupBody() }),
			res.response,
			next,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("any verify type other than api uses the library", async () => {
		const { connection } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"anything-else",
			request({ body: signupBody() }),
			responseStub().response,
			next,
		);
		expect(mocks.isVerified).toHaveBeenCalledTimes(1);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("login", () => {
	const salt = "0xsalt";
	// The stored hash for password "hunter2" with the salt above, produced by
	// the same hashPassword the controller uses.
	const storedUser = async (): Promise<{ password: string; salt: string }> => {
		const { connection, model } = connectionWith(userModel({}));
		await signup(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			responseStub().response,
			next,
		);
		const created = model.create.mock.calls[0]?.[0] as Record<string, string>;
		return { password: String(created.password), salt: String(created.salt) };
	};

	test("issues a token for the right password", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([200]);
		const body = res.bodies[0] as { message: string; token: string };
		expect(body.message).toBe("user logged in");
		const decoded = jwt.verify(body.token, "secret") as { email: string };
		expect(decoded.email).toBe("user@example.com");
	});

	test("rejects the wrong password", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody({ password: "not-hunter2" }) }),
			res.response,
		);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([{ message: "invalid credentials" }]);
	});

	test("rejects a password that hashes right against the wrong salt", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(
			userModel({ found: { password: user.password, salt: "0xdifferent" } }),
		);
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([401]);
	});

	test("reports an unknown email as not found", async () => {
		const { connection } = connectionWith(userModel({ found: null }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([404]);
		expect(res.bodies).toEqual([{ message: "user not found" }]);
		// No captcha verification for an account that doesn't exist.
		expect(mocks.isVerified).not.toHaveBeenCalled();
	});

	test("refuses a login that failed the captcha", async () => {
		const user = await storedUser();
		mocks.isVerified.mockResolvedValue({ verified: false });
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([
			{ message: "user has not completed a captcha", verified: false },
		]);
	});

	test("does not send the email to the verifier", async () => {
		// Unlike signup, login verifies the token alone — the provider has no
		// signup record to match an email against.
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			responseStub().response,
		);
		expect(mocks.isVerified).toHaveBeenLastCalledWith(
			"0xtoken",
			"NO_IP",
			undefined,
		);
	});

	test("passes the caller's IP through", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({
				body: signupBody(),
				headers: { "x-client-ip": "203.0.113.9" },
			}),
			responseStub().response,
		);
		expect(mocks.isVerified).toHaveBeenLastCalledWith(
			"0xtoken",
			"203.0.113.9",
			undefined,
		);
	});

	test("refuses to run without a site private key", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig({}),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("reports a database failure as a server error", async () => {
		const { connection } = connectionWith(
			userModel({ findOneRejects: new Error("mongo unavailable") }),
		);
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toEqual([{ message: "mongo unavailable" }]);
	});

	test("falls back to a message when the failure carries none", async () => {
		const { connection } = connectionWith(
			userModel({ findOneRejects: new Error("") }),
		);
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.bodies).toEqual([{ message: "internal server error" }]);
	});

	test("rejects a body that isn't a login", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"local",
			request({ body: signupBody({ siteKey: undefined }) }),
			res.response,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("verifies through the API endpoint when asked to", async () => {
		const user = await storedUser();
		const { connection } = connectionWith(userModel({ found: user }));
		const res = responseStub();
		await login(
			connection,
			serverConfig(),
			VERIFY_ENDPOINT,
			"api",
			request({ body: signupBody() }),
			res.response,
		);
		expect(res.statuses).toEqual([200]);
		const body: Record<string, string> = JSON.parse(
			String(fetchMock.mock.calls[0]?.[1]?.body),
		);
		expect(body.email).toBeUndefined();
	});
});

describe("isAuth", () => {
	const bearer = (token: string): string => `Bearer ${token}`;

	test("lets a valid token through", () => {
		const res = responseStub();
		isAuth(
			request({
				authorization: bearer(jwt.sign({ email: "a@b.c" }, "secret")),
			}),
			res.response,
		);
		expect(res.statuses).toEqual([200]);
		expect(res.bodies).toEqual([{ message: "here is your resource" }]);
	});

	test("refuses a request with no Authorization header", () => {
		// The header check used to fall through to splitting the empty string,
		// which threw before any response was sent.
		const res = responseStub();
		isAuth(request({}), res.response);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([{ message: "not authenticated" }]);
	});

	test("refuses an Authorization header with no token", () => {
		const res = responseStub();
		isAuth(request({ authorization: "Bearer" }), res.response);
		expect(res.statuses).toEqual([401]);
	});

	test("refuses a Bearer header whose token is empty", () => {
		// "Bearer " splits into two parts, so the length check passes and the
		// empty token reached jwt.verify, which threw and read as a 500.
		const res = responseStub();
		isAuth(request({ authorization: "Bearer " }), res.response);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([{ message: "not authenticated" }]);
	});

	test("reports a token it cannot decode, and only once", () => {
		// A failed verify used to send a 500 and then a 401 on the same
		// response, which express rejects as headers-already-sent.
		const res = responseStub();
		isAuth(request({ authorization: bearer("not-a-jwt") }), res.response);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toHaveLength(1);
	});

	test("rejects a token signed with a different secret", () => {
		const res = responseStub();
		isAuth(
			request({
				authorization: bearer(jwt.sign({ email: "a@b.c" }, "other-secret")),
			}),
			res.response,
		);
		expect(res.statuses).toEqual([500]);
	});

	test("rejects an expired token", () => {
		const res = responseStub();
		isAuth(
			request({
				authorization: bearer(
					jwt.sign({ email: "a@b.c" }, "secret", { expiresIn: -10 }),
				),
			}),
			res.response,
		);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toEqual([{ message: "jwt expired" }]);
	});

	test("describes a decode failure that carries no message", () => {
		vi.spyOn(jwt, "verify").mockImplementation((): string => {
			throw new Error("");
		});
		const res = responseStub();
		isAuth(request({ authorization: bearer("whatever") }), res.response);
		expect(res.statuses).toEqual([500]);
		expect(res.bodies).toEqual([{ message: "could not decode the token" }]);
	});

	test("treats an empty decode as unauthorized", () => {
		// jwt.verify resolves to a payload or throws; the guard is defensive,
		// and this pins what it does if a future jwt version returns nothing.
		vi.spyOn(jwt, "verify").mockImplementation((): string => "");
		const res = responseStub();
		isAuth(request({ authorization: bearer("whatever") }), res.response);
		expect(res.statuses).toEqual([401]);
		expect(res.bodies).toEqual([{ message: "unauthorized" }]);
	});

	test("ignores anything after the token", () => {
		const res = responseStub();
		isAuth(
			request({
				authorization: `Bearer ${jwt.sign({ email: "a@b.c" }, "secret")} extra`,
			}),
			res.response,
		);
		expect(res.statuses).toEqual([200]);
	});
});

describe("the exported surface", () => {
	test("keeps the token type the handlers accept", () => {
		// A compile-time reminder that the request token is the shared type,
		// not a bare string the controllers invent.
		const token: ProcaptchaToken = "0xtoken";
		expect(token.startsWith("0x")).toBe(true);
	});

	test("the pair helper only ever sees the address", () => {
		expect(pairWithAddress(SITE_KEY).address).toBe(SITE_KEY);
	});
});
