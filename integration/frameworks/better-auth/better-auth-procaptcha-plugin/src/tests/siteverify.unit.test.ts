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
import { describe, expect, it, vi } from "vitest";
import { verifyProcaptchaToken } from "../siteverify.js";
import {
	errorEnvelope,
	mockSiteVerify,
	rejectedResponse,
	verifiedResponse,
} from "./siteVerifyMock.js";

describe("verifyProcaptchaToken", () => {
	it("reports a verified token with its score", async () => {
		const { fetch } = mockSiteVerify(() => verifiedResponse({ score: 0.2 }));

		await expect(
			verifyProcaptchaToken({ secretKey: "s", token: "t", fetch }),
		).resolves.toEqual({ outcome: "verified", score: 0.2 });
	});

	it("reports a rejected token with its reason", async () => {
		const { fetch } = mockSiteVerify(() =>
			rejectedResponse("API.USER_ALREADY_VERIFIED"),
		);

		await expect(
			verifyProcaptchaToken({ secretKey: "s", token: "t", fetch }),
		).resolves.toEqual({
			outcome: "rejected",
			reason: "API.USER_ALREADY_VERIFIED",
		});
	});

	it("passes through the error key of a 4xx envelope as a permanent error", async () => {
		const { fetch } = mockSiteVerify(() =>
			errorEnvelope(400, "GENERAL.MISSING_SECRET_KEY", "Missing secret key"),
		);

		await expect(
			verifyProcaptchaToken({ secretKey: "s", token: "t", fetch }),
		).resolves.toEqual({
			outcome: "error",
			transient: false,
			status: 400,
			key: "GENERAL.MISSING_SECRET_KEY",
			message: "Missing secret key",
		});
	});

	it("does not send empty optional fields", async () => {
		const { fetch, calls } = mockSiteVerify();

		await verifyProcaptchaToken({
			secretKey: "s",
			token: "t",
			ip: "",
			email: "",
			fetch,
		});

		expect(calls[0]?.body).toEqual({ secret: "s", token: "t" });
	});

	it("aborts a slow siteverify call after timeoutMs", async () => {
		const slowFetch = vi.fn<typeof fetch>(
			(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason),
					);
				}),
		);

		const result = await verifyProcaptchaToken({
			secretKey: "s",
			token: "t",
			timeoutMs: 20,
			fetch: slowFetch,
		});

		expect(result).toMatchObject({ outcome: "error", transient: true });
	});
});
