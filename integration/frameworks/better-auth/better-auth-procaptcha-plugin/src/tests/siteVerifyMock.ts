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
import { type Mock, vi } from "vitest";
import type {
	SiteVerifyErrorResponse,
	SiteVerifyRequestBody,
	SiteVerifyResponse,
} from "../siteverify.js";

export interface SiteVerifyCall {
	url: string;
	headers: Headers;
	body: SiteVerifyRequestBody;
}

export type SiteVerifyResponder = (
	body: SiteVerifyRequestBody,
) => Response | Promise<Response>;

export interface SiteVerifyMock {
	fetch: Mock<typeof fetch>;
	calls: SiteVerifyCall[];
}

const isRequestBody = (value: unknown): value is SiteVerifyRequestBody =>
	typeof value === "object" &&
	value !== null &&
	"secret" in value &&
	typeof value.secret === "string" &&
	"token" in value &&
	typeof value.token === "string";

export const verifiedResponse = (
	overrides: Partial<SiteVerifyResponse> = {},
): Response => {
	const body: SiteVerifyResponse = {
		status: "ok",
		verified: true,
		...overrides,
	};
	return Response.json(body);
};

export const rejectedResponse = (reason?: string): Response => {
	const body: SiteVerifyResponse = {
		status: "ok",
		verified: false,
		...(reason ? { reason } : {}),
	};
	return Response.json(body);
};

export const errorEnvelope = (
	status: number,
	key: string,
	message: string,
): Response => {
	const body: SiteVerifyErrorResponse = {
		error: { code: status, key, message },
	};
	return Response.json(body, { status });
};

export const mockSiteVerify = (
	respond: SiteVerifyResponder = () => verifiedResponse(),
): SiteVerifyMock => {
	const calls: SiteVerifyCall[] = [];
	const fetchMock = vi.fn<typeof fetch>(
		async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const parsed: unknown = JSON.parse(String(init?.body));
			if (!isRequestBody(parsed)) {
				throw new Error("siteverify was called without secret and token");
			}
			const url =
				input instanceof Request ? input.url : new URL(input).toString();
			calls.push({ url, headers: new Headers(init?.headers), body: parsed });
			return respond(parsed);
		},
	);
	return { fetch: fetchMock, calls };
};
