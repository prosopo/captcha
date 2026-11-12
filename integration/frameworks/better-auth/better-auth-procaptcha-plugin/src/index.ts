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
import type {
	AuthContext,
	BetterAuthOptions,
	BetterAuthPlugin,
} from "better-auth";
import { getIP } from "better-auth/api";
import {
	DEFAULT_ENDPOINTS,
	DEFAULT_TIMEOUT_MS,
	PROCAPTCHA_ERROR_CODES,
	PROCAPTCHA_HEADER,
	PROCAPTCHA_SITEVERIFY_URL,
	type ProcaptchaErrorCode,
} from "./constants.js";
import { createPathMatcher, normalizeAuthPath } from "./path.js";
import { verifyProcaptchaToken } from "./siteverify.js";

export {
	DEFAULT_ENDPOINTS,
	PROCAPTCHA_ERROR_CODES,
	PROCAPTCHA_HEADER,
	PROCAPTCHA_SITEVERIFY_URL,
	type ProcaptchaErrorCode,
} from "./constants.js";
export {
	verifyProcaptchaToken,
	type SiteVerifyErrorResponse,
	type SiteVerifyRequestBody,
	type SiteVerifyResponse,
	type VerifyResult,
	type VerifyTokenParams,
} from "./siteverify.js";

export interface ProcaptchaOptions {
	/** Secret key for your site, from the Prosopo portal. */
	secretKey: string;
	/**
	 * Auth paths to protect, without the Better Auth base path. Paths match
	 * exactly unless they contain `*` (one segment) or `**` (any depth).
	 *
	 * @default ["/sign-up/email", "/sign-in/email", "/request-password-reset"]
	 */
	endpoints?: readonly string[];
	/** @default "https://api.prosopo.io/siteverify" */
	siteVerifyURL?: string;
	/** @default "x-captcha-response" */
	headerName?: string;
	/**
	 * Send the client IP (resolved with Better Auth's `advanced.ipAddress`
	 * settings) so Prosopo can check it against the IP that solved the captcha.
	 *
	 * @default true
	 */
	sendIP?: boolean;
	/**
	 * Send the domain of the `email` field in the JSON request body, for
	 * Prosopo's disposable and spam email filtering.
	 *
	 * @default false
	 */
	sendEmailDomain?: boolean;
	/**
	 * Reject verified tokens whose risk score is above this value. Scores run
	 * from 0 (human) to 1 (bot) and are only returned on plans that include
	 * scoring; tokens without a score are not affected.
	 */
	maxScore?: number;
	/** @default 10000 */
	timeoutMs?: number;
	/** Custom fetch implementation, for example to route through a proxy. */
	fetch?: typeof fetch;
}

const errorResponse = (
	code: ProcaptchaErrorCode,
	status: number,
): { response: Response } => ({
	response: Response.json(
		{ code, message: PROCAPTCHA_ERROR_CODES[code].message },
		{ status },
	),
});

const resolveClientIP = (
	request: Request,
	options: BetterAuthOptions,
): string | undefined =>
	getIP(request, {
		...options,
		advanced: {
			...options.advanced,
			ipAddress: { ...options.advanced?.ipAddress, ipv6Subnet: 128 },
		},
	}) ?? undefined;

const readEmailDomain = async (
	request: Request,
): Promise<string | undefined> => {
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return undefined;
	}
	try {
		const body: unknown = await request.clone().json();
		if (typeof body !== "object" || body === null || !("email" in body)) {
			return undefined;
		}
		const { email } = body;
		if (typeof email !== "string") {
			return undefined;
		}
		const domain = email.slice(email.lastIndexOf("@") + 1).trim();
		return email.includes("@") && domain ? domain.toLowerCase() : undefined;
	} catch {
		return undefined;
	}
};

export const procaptcha = (options: ProcaptchaOptions) => {
	const isProtected = createPathMatcher(
		options.endpoints?.length ? options.endpoints : DEFAULT_ENDPOINTS,
	);
	const headerName = options.headerName ?? PROCAPTCHA_HEADER;

	return {
		id: "procaptcha",
		$ERROR_CODES: PROCAPTCHA_ERROR_CODES,
		onRequest: async (
			request: Request,
			ctx: AuthContext,
		): Promise<{ response: Response } | undefined> => {
			const path = normalizeAuthPath(
				new URL(request.url).pathname,
				ctx.options.basePath ?? "/api/auth",
			);
			if (!isProtected(path)) {
				return undefined;
			}

			if (!options.secretKey) {
				ctx.logger.error("Procaptcha: secretKey is not configured");
				return errorResponse("PROCAPTCHA_UNKNOWN_ERROR", 500);
			}

			const token = request.headers.get(headerName);
			if (!token) {
				return errorResponse("PROCAPTCHA_MISSING_RESPONSE", 400);
			}

			const ip =
				options.sendIP === false
					? undefined
					: resolveClientIP(request, ctx.options);
			const email = options.sendEmailDomain
				? await readEmailDomain(request)
				: undefined;

			const result = await verifyProcaptchaToken({
				secretKey: options.secretKey,
				token,
				...(ip ? { ip } : {}),
				...(email ? { email } : {}),
				siteVerifyURL: options.siteVerifyURL ?? PROCAPTCHA_SITEVERIFY_URL,
				timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
				...(options.fetch ? { fetch: options.fetch } : {}),
			});

			if (result.outcome === "error") {
				ctx.logger.error("Procaptcha siteverify failed", {
					status: result.status,
					key: result.key,
					message: result.message,
				});
				return result.transient
					? errorResponse("PROCAPTCHA_SERVICE_UNAVAILABLE", 503)
					: errorResponse("PROCAPTCHA_UNKNOWN_ERROR", 500);
			}

			if (result.outcome === "rejected") {
				return errorResponse("PROCAPTCHA_VERIFICATION_FAILED", 403);
			}

			if (
				options.maxScore !== undefined &&
				result.score !== undefined &&
				result.score > options.maxScore
			) {
				return errorResponse("PROCAPTCHA_VERIFICATION_FAILED", 403);
			}

			return undefined;
		},
		options,
	} satisfies BetterAuthPlugin;
};
