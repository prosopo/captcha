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

//   token = base64url(sha256(securityKey + path + expires [+ clientIp]))
//   url   = <origin><path>?token=<token>&expires=<expires>

export const DEFAULT_ASSET_TOKEN_TTL_SECONDS = 300;

export const assetTokenBase = (
	securityKey: string,
	path: string,
	expires: number,
	clientIp?: string,
): string => `${securityKey}${path}${expires}${clientIp ?? ""}`;

export const encodeAssetToken = (digest: Uint8Array): string => {
	let binary = "";
	for (const byte of digest) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

export interface SignAssetUrlOptions {
	readonly securityKey: string;
	readonly ttlSeconds?: number;
	readonly clientIp?: string;
	readonly now?: () => number;
}

export const signAssetUrl = async (
	url: string,
	options: SignAssetUrlOptions,
): Promise<string> => {
	const parsed = parseHttpUrl(url);
	if (!parsed || parsed.searchParams.has("token")) {
		return url;
	}
	const expires =
		Math.floor((options.now?.() ?? Date.now()) / 1000) +
		(options.ttlSeconds ?? DEFAULT_ASSET_TOKEN_TTL_SECONDS);
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(
			assetTokenBase(
				options.securityKey,
				parsed.pathname,
				expires,
				options.clientIp,
			),
		),
	);
	const token = encodeAssetToken(new Uint8Array(digest));
	return `${parsed.origin}${parsed.pathname}?token=${token}&expires=${expires}`;
};

export const assetTokenOptionsFromEnv = (): SignAssetUrlOptions | undefined => {
	if (typeof process === "undefined") {
		return undefined;
	}
	const securityKey = process.env.PROSOPO_ASSET_TOKEN_KEY;
	if (!securityKey) {
		return undefined;
	}
	const ttlSeconds = Number.parseInt(
		process.env.PROSOPO_ASSET_TOKEN_TTL_SECONDS ?? "",
		10,
	);
	return {
		securityKey,
		ttlSeconds: Number.isNaN(ttlSeconds)
			? DEFAULT_ASSET_TOKEN_TTL_SECONDS
			: ttlSeconds,
	};
};

const parseHttpUrl = (url: string): URL | undefined => {
	try {
		const parsed = new URL(url);
		return "http:" === parsed.protocol || "https:" === parsed.protocol
			? parsed
			: undefined;
	} catch {
		return undefined;
	}
};
