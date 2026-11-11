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
import { describe, expect, it, vi } from "vitest";
import {
	type ProcaptchaClientOptions,
	procaptchaClient,
	procaptchaHeaders,
} from "../client.js";
import { procaptcha } from "../index.js";
import { mockSiteVerify } from "./siteVerifyMock.js";

const setup = async (clientOptions: ProcaptchaClientOptions) => {
	const siteVerify = mockSiteVerify();
	const { client } = await getTestInstance(
		{
			plugins: [procaptcha({ secretKey: "secret", fetch: siteVerify.fetch })],
		},
		{ clientOptions: { plugins: [procaptchaClient(clientOptions)] } },
	);
	return { client, siteVerify };
};

describe("procaptcha client plugin", () => {
	it("builds the header the server plugin reads", () => {
		expect(procaptchaHeaders("tok")).toEqual({ "x-captcha-response": "tok" });
		expect(procaptchaHeaders("tok", "x-custom")).toEqual({ "x-custom": "tok" });
	});

	it("attaches the token from getToken to protected requests", async () => {
		const getToken = vi.fn<() => Promise<string>>(async () => "auto-token");
		const { client, siteVerify } = await setup({ getToken });

		const result = await client.signIn.email({
			email: "test@test.com",
			password: "test123456",
		});

		expect(result.error).toBeNull();
		expect(getToken).toHaveBeenCalledTimes(1);
		expect(siteVerify.calls[0]?.body.token).toBe("auto-token");
	});

	it("does not ask for a token on unprotected requests", async () => {
		const getToken = vi.fn<() => string>(() => "auto-token");
		const { client } = await setup({ getToken });

		await client.getSession();

		expect(getToken).not.toHaveBeenCalled();
	});

	it("keeps a token passed explicitly in fetchOptions", async () => {
		const getToken = vi.fn<() => string>(() => "auto-token");
		const { client, siteVerify } = await setup({ getToken });

		await client.signIn.email({
			email: "test@test.com",
			password: "test123456",
			fetchOptions: { headers: procaptchaHeaders("explicit-token") },
		});

		expect(getToken).not.toHaveBeenCalled();
		expect(siteVerify.calls[0]?.body.token).toBe("explicit-token");
	});

	it("sends no header when getToken has no token yet", async () => {
		const { client, siteVerify } = await setup({ getToken: () => undefined });

		const result = await client.signIn.email({
			email: "test@test.com",
			password: "test123456",
		});

		expect(result.error?.status).toBe(400);
		expect(siteVerify.calls).toHaveLength(0);
	});
});
