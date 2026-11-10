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
import type { VerificationResponse } from "@prosopo/types";
import { DEFAULT_TIMEOUT_MS, PROCAPTCHA_SITEVERIFY_URL } from "./constants.js";

export interface SiteVerifyRequestBody {
	secret: string;
	token: string;
	ip?: string;
	email?: string;
}

export type SiteVerifyResponse = Omit<
	VerificationResponse,
	"error" | "sessionId"
>;

export interface SiteVerifyErrorResponse {
	error: {
		code: number;
		key: string;
		message: string | unknown[];
	};
}

export type VerifyResult =
	| { outcome: "verified"; score?: number }
	| { outcome: "rejected"; reason?: string; score?: number }
	| {
			outcome: "error";
			transient: boolean;
			status?: number;
			key?: string;
			message: string;
	  };

export interface VerifyTokenParams {
	secretKey: string;
	token: string;
	ip?: string;
	email?: string;
	siteVerifyURL?: string;
	timeoutMs?: number;
	fetch?: typeof fetch;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isSiteVerifyResponse = (value: unknown): value is SiteVerifyResponse =>
	isRecord(value) &&
	typeof value.status === "string" &&
	typeof value.verified === "boolean" &&
	(value.score === undefined || typeof value.score === "number") &&
	(value.reason === undefined || typeof value.reason === "string");

const isSiteVerifyErrorResponse = (
	value: unknown,
): value is SiteVerifyErrorResponse =>
	isRecord(value) &&
	isRecord(value.error) &&
	typeof value.error.key === "string";

const readJson = async (response: Response): Promise<unknown> => {
	try {
		const body: unknown = await response.json();
		return body;
	} catch {
		return undefined;
	}
};

const isTransientStatus = (status: number): boolean =>
	status === 429 || status >= 500;

export const verifyProcaptchaToken = async ({
	secretKey,
	token,
	ip,
	email,
	siteVerifyURL = PROCAPTCHA_SITEVERIFY_URL,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	fetch: fetchImpl = fetch,
}: VerifyTokenParams): Promise<VerifyResult> => {
	const body: SiteVerifyRequestBody = {
		secret: secretKey,
		token,
		...(ip ? { ip } : {}),
		...(email ? { email } : {}),
	};

	let response: Response;
	try {
		response = await fetchImpl(siteVerifyURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (error) {
		return {
			outcome: "error",
			transient: true,
			message: error instanceof Error ? error.message : String(error),
		};
	}

	const payload = await readJson(response);

	if (!response.ok) {
		const errorBody = isSiteVerifyErrorResponse(payload)
			? payload.error
			: undefined;
		return {
			outcome: "error",
			transient: isTransientStatus(response.status),
			status: response.status,
			...(errorBody ? { key: errorBody.key } : {}),
			message:
				typeof errorBody?.message === "string"
					? errorBody.message
					: `siteverify responded with HTTP ${response.status}`,
		};
	}

	if (!isSiteVerifyResponse(payload)) {
		return {
			outcome: "error",
			transient: true,
			status: response.status,
			message: "siteverify returned an unexpected response body",
		};
	}

	const score = payload.score === undefined ? {} : { score: payload.score };
	if (!payload.verified) {
		return {
			outcome: "rejected",
			...(payload.reason ? { reason: payload.reason } : {}),
			...score,
		};
	}
	return { outcome: "verified", ...score };
};
