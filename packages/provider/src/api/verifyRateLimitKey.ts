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
import { ApiParams, decodeProcaptchaOutput } from "@prosopo/types";
import type { Request } from "express";
import { object, string } from "zod";
import { isSignatureValid } from "../tasks/signatureCheck.js";

const SignedVerifyBody = object({
	[ApiParams.token]: string(),
	[ApiParams.dappSignature]: string(),
});

const authenticatedSiteKey = (body: unknown): string | undefined => {
	const parsed = SignedVerifyBody.safeParse(body);
	if (!parsed.success) return undefined;
	try {
		const { dapp, timestamp } = decodeProcaptchaOutput(parsed.data.token);
		return isSignatureValid(
			timestamp.toString(),
			parsed.data.dappSignature,
			dapp,
		)
			? dapp
			: undefined;
	} catch {
		return undefined;
	}
};

/**
 * Verify calls come from site backends, so a site gets one allowance however
 * many servers it verifies from. The site key only counts once the dapp
 * signature over the token proves the caller holds it; anything else is
 * limited by IP, so naming another site's key cannot use up its allowance.
 */
export const verifyRateLimitKey = (req: Pick<Request, "body" | "ip">): string =>
	siteOrIpRateLimitKey(authenticatedSiteKey(req.body), req);

export const siteOrIpRateLimitKey = (
	authenticatedSiteKey: string | undefined,
	req: Pick<Request, "ip">,
): string =>
	authenticatedSiteKey
		? `site:${authenticatedSiteKey}`
		: `ip:${req.ip ?? "unknown"}`;
