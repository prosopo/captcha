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
import { getTestInstance } from "better-auth/test";
import { describe, expect, it } from "vitest";
import {
	PROCAPTCHA_SITEVERIFY_URL,
	type ProcaptchaOptions,
	procaptcha,
} from "../index.js";
import {
	type SiteVerifyMock,
	type SiteVerifyResponder,
	errorEnvelope,
	mockSiteVerify,
	rejectedResponse,
	verifiedResponse,
} from "./siteVerifyMock.js";

const TOKEN = "procaptcha-token";
const SECRET = "test-secret-key";
const CLIENT_IP = "203.0.113.7";

interface Harness {
	siteVerify: SiteVerifyMock;
	signIn: (headers?: Record<string, string>) => Promise<Response>;
	signUp: (
		email: string,
		headers?: Record<string, string>,
	) => Promise<Response>;
}

const setup = async (
	options: Partial<ProcaptchaOptions> = {},
	respond?: SiteVerifyResponder,
): Promise<Harness> => {
	const siteVerify = mockSiteVerify(respond);
	const { auth } = await getTestInstance({
		plugins: [
			procaptcha({ secretKey: SECRET, fetch: siteVerify.fetch, ...options }),
		],
	});
	const post = (
		path: string,
		body: Record<string, string>,
		headers: Record<string, string>,
	): Promise<Response> =>
		auth.handler(
			new Request(`http://localhost:3000/api/auth${path}`, {
				method: "POST",
				headers: { "content-type": "application/json", ...headers },
				body: JSON.stringify(body),
			}),
		);
	return {
		siteVerify,
		signIn: (headers = {}) =>
			post(
				"/sign-in/email",
				{ email: "test@test.com", password: "test123456" },
				headers,
			),
		signUp: (email, headers = {}) =>
			post(
				"/sign-up/email",
				{ email, password: "a-long-password", name: "New User" },
				headers,
			),
	};
};

const withToken = (
	extra: Record<string, string> = {},
): Record<string, string> => ({
	"x-captcha-response": TOKEN,
	"x-forwarded-for": CLIENT_IP,
	...extra,
});

interface ErrorBody {
	code: string;
	message: string;
}

const readError = async (response: Response): Promise<ErrorBody> => {
	const body: unknown = await response.json();
	if (
		typeof body !== "object" ||
		body === null ||
		!("code" in body) ||
		typeof body.code !== "string" ||
		!("message" in body) ||
		typeof body.message !== "string"
	) {
		throw new Error(`unexpected error body: ${JSON.stringify(body)}`);
	}
	return { code: body.code, message: body.message };
};

describe("procaptcha server plugin", () => {
	it("lets a request with a verified token through and sends secret, token and IP", async () => {
		const { signIn, siteVerify } = await setup();

		const response = await signIn(withToken());

		expect(response.status).toBe(200);
		expect(siteVerify.calls).toHaveLength(1);
		const [call] = siteVerify.calls;
		expect(call?.url).toBe(PROCAPTCHA_SITEVERIFY_URL);
		expect(call?.headers.get("content-type")).toBe("application/json");
		expect(call?.body).toEqual({ secret: SECRET, token: TOKEN, ip: CLIENT_IP });
	});

	it("returns 400 without calling siteverify when the token header is missing", async () => {
		const { signIn, siteVerify } = await setup();

		const response = await signIn({ "x-forwarded-for": CLIENT_IP });

		expect(response.status).toBe(400);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect((await readError(response)).code).toBe(
			"PROCAPTCHA_MISSING_RESPONSE",
		);
		expect(siteVerify.calls).toHaveLength(0);
	});

	it("returns 403 when siteverify answers verified: false", async () => {
		const { signIn } = await setup({}, () =>
			rejectedResponse("API.USER_ALREADY_VERIFIED"),
		);

		const response = await signIn(withToken());

		expect(response.status).toBe(403);
		expect((await readError(response)).code).toBe(
			"PROCAPTCHA_VERIFICATION_FAILED",
		);
	});

	it("leaves endpoints outside the list alone", async () => {
		const { signIn, siteVerify } = await setup({
			endpoints: ["/sign-up/email"],
		});

		const response = await signIn();

		expect(response.status).toBe(200);
		expect(siteVerify.calls).toHaveLength(0);
	});

	it("matches wildcard endpoints", async () => {
		const { signIn, siteVerify } = await setup({ endpoints: ["/sign-in/*"] });

		const response = await signIn();

		expect(response.status).toBe(400);
		expect(siteVerify.calls).toHaveLength(0);
	});

	it("rejects a verified token whose score is above maxScore", async () => {
		const { signIn } = await setup({ maxScore: 0.5 }, () =>
			verifiedResponse({ score: 0.9 }),
		);

		const response = await signIn(withToken());

		expect(response.status).toBe(403);
	});

	it("accepts a verified token at or below maxScore, or with no score", async () => {
		let score: number | undefined = 0.5;
		const { signIn } = await setup({ maxScore: 0.5 }, () =>
			verifiedResponse(score === undefined ? {} : { score }),
		);

		expect((await signIn(withToken())).status).toBe(200);
		score = undefined;
		expect((await signIn(withToken())).status).toBe(200);
	});

	it("omits the IP when sendIP is false", async () => {
		const { signIn, siteVerify } = await setup({ sendIP: false });

		await signIn(withToken());

		expect(siteVerify.calls[0]?.body).toEqual({ secret: SECRET, token: TOKEN });
	});

	it("sends the full IPv6 address rather than Better Auth's rate-limit subnet", async () => {
		const { signIn, siteVerify } = await setup();

		await signIn(withToken({ "x-forwarded-for": "2001:db8::1" }));

		expect(siteVerify.calls[0]?.body.ip).toBe(
			"2001:0db8:0000:0000:0000:0000:0000:0001",
		);
	});

	it("sends only the email domain when sendEmailDomain is on", async () => {
		const { signUp, siteVerify } = await setup({ sendEmailDomain: true });

		const response = await signUp("New.User@Example.COM", withToken());

		expect(response.status).toBe(200);
		expect(siteVerify.calls[0]?.body.email).toBe("example.com");
	});

	it("does not send the email by default", async () => {
		const { signUp, siteVerify } = await setup();

		await signUp("someone@example.com", withToken());

		expect(siteVerify.calls[0]?.body.email).toBeUndefined();
	});

	it("uses a custom header name and siteverify URL", async () => {
		const siteVerifyURL = "https://eu-api.prosopo.io/siteverify";
		const { signIn, siteVerify } = await setup({
			headerName: "x-procaptcha-response",
			siteVerifyURL,
		});

		const response = await signIn({ "x-procaptcha-response": TOKEN });

		expect(response.status).toBe(200);
		expect(siteVerify.calls[0]?.url).toBe(siteVerifyURL);
	});

	it("returns 500 when siteverify rejects the request itself", async () => {
		const { signIn } = await setup({}, () =>
			errorEnvelope(400, "API.INVALID_SITE_KEY", "Invalid site key"),
		);

		const response = await signIn(withToken());

		expect(response.status).toBe(500);
		expect((await readError(response)).code).toBe("PROCAPTCHA_UNKNOWN_ERROR");
	});

	it.each([
		["a 5xx", (): Response => errorEnvelope(500, "API.BAD_REQUEST", "x")],
		["a 429", (): Response => errorEnvelope(429, "API.BAD_REQUEST", "x")],
		[
			"a non-JSON 502",
			(): Response => new Response("bad gateway", { status: 502 }),
		],
		["an unexpected body", (): Response => Response.json({ ok: true })],
		[
			"a network failure",
			(): Response => {
				throw new TypeError("fetch failed");
			},
		],
	])("returns 503 on %s", async (_label: string, respond: () => Response) => {
		const { signIn } = await setup({}, respond);

		const response = await signIn(withToken());

		expect(response.status).toBe(503);
		expect((await readError(response)).code).toBe(
			"PROCAPTCHA_SERVICE_UNAVAILABLE",
		);
	});

	it("returns 500 without calling siteverify when no secret key is configured", async () => {
		const { signIn, siteVerify } = await setup({ secretKey: "" });

		const response = await signIn(withToken());

		expect(response.status).toBe(500);
		expect(siteVerify.calls).toHaveLength(0);
	});
});
