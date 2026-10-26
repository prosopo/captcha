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

import {
	type AuthMiddlewareOptions,
	createMemoryJwtReplayGuard,
} from "@prosopo/api-express-router";

/** Longest admin token lifetime (exp - iat) accepted by default, in seconds. */
export const DEFAULT_ADMIN_JWT_MAX_LIFETIME_SECONDS = 3600;

const parseList = (value: string | undefined): string[] =>
	(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);

/**
 * Admin JWT checks for this provider.
 *
 * - Audience: a token carrying `aud` must name this provider. The accepted
 *   values come from PROSOPO_ADMIN_JWT_AUDIENCE (comma separated), else from
 *   the provider host as both `host` and `https://host`. Tokens without `aud`
 *   are still accepted until PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE=true.
 * - Replay: a token carrying `jti` is accepted once per process.
 * - Lifetime: exp - iat may not exceed PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS
 *   (default one hour).
 */
export const adminAuthOptions = (
	vars: Record<string, string | undefined>,
	host: string | undefined,
): AuthMiddlewareOptions => {
	const configured = parseList(vars.PROSOPO_ADMIN_JWT_AUDIENCE);
	const requireAudience = vars.PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE === "true";
	const derived = host ? [host, `https://${host}`] : [];
	const candidates = configured.length > 0 ? configured : derived;
	// Requiring an audience with nothing to match it against fails closed.
	const audience =
		candidates.length > 0 || requireAudience ? candidates : undefined;

	const maxLifetime = Number.parseInt(
		vars.PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS ?? "",
		10,
	);

	return {
		verify: {
			audience,
			requireAudience,
			maxLifetimeSeconds:
				Number.isFinite(maxLifetime) && maxLifetime > 0
					? maxLifetime
					: DEFAULT_ADMIN_JWT_MAX_LIFETIME_SECONDS,
		},
		replayGuard: createMemoryJwtReplayGuard(),
	};
};
