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

// Rewrites captcha image URLs into short-lived signed URLs at serve time.
//
// The dataset stores one canonical CDN URL per item and commits to
// `blake2b(image bytes)` as the item hash. Signing happens strictly below
// `item.data` — the hash, the captchaId and the datasetId are untouched, so
// enabling this changes nothing about the dataset or its verification.
//
// Without it, a captcha image URL is permanent, unauthenticated and
// cacheable: harvest the URLs once and the pool can be refetched forever,
// offline and unattributably. With it, a harvested URL is dead within
// `ttlSeconds` and every image has to be requested through the provider API,
// which is rate limited, logged and attributable.
//
// Bunny's token scheme (verified against a live zone):
//   token   = base64url(sha256(securityKey + path + expires [+ clientIp]))
//             with `+`->`-`, `/`->`_`, `=` stripped
//   url     = <origin><path>?token=<token>&expires=<expires>
// A token is bound to its exact path, so it cannot be replayed against a
// different image.

import { createHash } from "node:crypto";
import type { Asset, AssetsResolver } from "@prosopo/types";

export const DEFAULT_ASSET_TOKEN_TTL_SECONDS = 300;

export interface SignedAssetsResolverOptions {
	securityKey: string;
	ttlSeconds?: number;
	// Only set this when the pull zone has `ZoneSecurityIncludeHashRemoteIP`
	// enabled. The two must agree or every URL 403s.
	clientIp?: string;
	// Injectable so tests do not depend on the wall clock.
	now?: () => number;
}

export class SignedAssetsResolver implements AssetsResolver {
	private readonly securityKey: string;
	private readonly ttlSeconds: number;
	private readonly clientIp: string | undefined;
	private readonly now: () => number;

	constructor(options: SignedAssetsResolverOptions) {
		this.securityKey = options.securityKey;
		this.ttlSeconds = options.ttlSeconds ?? DEFAULT_ASSET_TOKEN_TTL_SECONDS;
		this.clientIp = options.clientIp;
		this.now = options.now ?? (() => Date.now());
	}

	private sign(path: string, expires: number): string {
		const base = `${this.securityKey}${path}${expires}${this.clientIp ?? ""}`;
		return createHash("sha256")
			.update(base)
			.digest("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	}

	resolveAsset(assetURI: string): Asset {
		const url = this.toUrl(assetURI);

		// Local paths (dev/test fixtures) and anything unparseable are passed
		// through untouched rather than silently mangled.
		if (!url) {
			return { URI: assetURI, getURL: (): string => assetURI };
		}

		// Bunny folds existing query parameters into the hash, which this
		// simple form does not reproduce. Dataset URLs never carry one; if
		// that ever changes, signing would silently start producing 403s, so
		// refuse rather than emit a URL that cannot be fetched.
		if (url.search !== "") {
			throw new Error(
				`Cannot sign an asset URL that already has a query string: ${assetURI}`,
			);
		}

		const expires = Math.floor(this.now() / 1000) + this.ttlSeconds;
		const token = this.sign(url.pathname, expires);
		const signed = `${url.origin}${url.pathname}?token=${token}&expires=${expires}`;

		return { URI: assetURI, getURL: (): string => signed };
	}

	private toUrl(assetURI: string): URL | undefined {
		try {
			const url = new URL(assetURI);
			return url.protocol === "http:" || url.protocol === "https:"
				? url
				: undefined;
		} catch {
			return undefined;
		}
	}
}

/**
 * Build the resolver from the environment, or `undefined` when it is not
 * configured. Undefined means `parseCaptchaAssets` passes `item.data`
 * through unchanged — the behaviour before this existed — so the feature is
 * off until a key is deliberately supplied.
 */
export function getSignedAssetsResolver(
	clientIp?: string,
): AssetsResolver | undefined {
	const securityKey = process.env.PROSOPO_ASSET_TOKEN_KEY;
	if (!securityKey) {
		return undefined;
	}

	const ttlSeconds =
		Number.parseInt(process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS ?? "", 10) ||
		DEFAULT_ASSET_TOKEN_TTL_SECONDS;

	// Binding a URL to the requesting IP is stronger, but it has to match the
	// zone's `ZoneSecurityIncludeHashRemoteIP` setting exactly, and it breaks
	// any client whose image requests egress from a different address than
	// its API call. Off unless explicitly turned on.
	const bindIp = process.env.PROSOPO_ASSET_TOKEN_BIND_IP === "true";

	return new SignedAssetsResolver({
		securityKey,
		ttlSeconds,
		...(bindIp && clientIp ? { clientIp } : {}),
	});
}
