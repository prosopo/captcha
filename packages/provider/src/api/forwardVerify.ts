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

import { ProviderApi } from "@prosopo/api";
import { getProviders } from "@prosopo/load-balancer";
import type { Logger } from "@prosopo/logger";
import type { ClientApiPaths, VerificationResponse } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";

/**
 * A client can send a verify request to *any* pronode, not necessarily the
 * provider that issued the token. This determines the issuing provider from the
 * `providerUrl` embedded in the token and, when it is a *different* provider to
 * this one, forwards the verification request to it and returns its response —
 * mirroring the AWS Lambda verify endpoint, but running on a provider.
 *
 * Returns `null` when this provider is the issuer (or the issuer cannot be
 * determined), signalling the caller to verify locally as before.
 *
 * @param env - The provider environment
 * @param logger - Request-scoped logger
 * @param path - The verify path to forward to (kept identical, so the issuer
 *   routes the request to the correct captcha-type verification)
 * @param providerUrl - The issuing provider url, decoded from the token
 * @param dapp - The site key (used as the `Prosopo-Site-Key` header)
 * @param user - The user account (used as the `Prosopo-User` header)
 * @param body - The original, already-parsed request body, forwarded verbatim
 */
export async function forwardVerifyIfNotIssuer(args: {
	env: ProviderEnvironment;
	logger: Logger;
	path: ClientApiPaths;
	providerUrl: string | undefined;
	dapp: string;
	user: string;
	body: object;
}): Promise<VerificationResponse | null> {
	const { env, logger, path, providerUrl, dapp, user, body } = args;

	// No issuer url in the token → we can't forward; verify locally (this also
	// preserves behaviour for any older tokens that omit providerUrl).
	if (!providerUrl) {
		return null;
	}

	// Loading the provider list can fail (e.g. network/RPC error). Honour the
	// "returns null when the issuer cannot be determined" contract and degrade
	// gracefully to local verification rather than surfacing a 500.
	let providers: Awaited<ReturnType<typeof getProviders>>;
	try {
		providers = await getProviders(env.defaultEnvironment);
	} catch (error) {
		logger.warn(() => ({
			msg: "Failed to load provider list; verifying locally",
			err: error instanceof Error ? error : new Error(String(error)),
			data: { providerUrl },
		}));
		return null;
	}

	// SSRF guard: only ever forward to a url that belongs to a known provider.
	const issuer = providers.find((provider) => provider.url === providerUrl);
	if (!issuer) {
		logger.warn(() => ({
			msg: "Token providerUrl is not a known provider; verifying locally",
			data: { providerUrl },
		}));
		return null;
	}

	// If this node is the provider that issued the token, verify locally rather
	// than forwarding to ourselves (which would just add a redundant hop/loop).
	const self = env.pair
		? providers.find((provider) => provider.address === env.pair?.address)
		: undefined;
	if (self?.url === providerUrl) {
		return null;
	}

	logger.info(() => ({
		msg: "Forwarding verify request to issuing provider",
		data: { providerUrl, path, dapp },
	}));

	// Forward to the vetted canonical url from the provider list rather than the
	// raw token string (defence-in-depth; survives any future url normalisation).
	const providerApi = new ProviderApi(issuer.url, dapp);
	return providerApi.forwardVerify(path, body, user);
}
