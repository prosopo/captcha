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

import { readProviderListOverride } from "@prosopo/load-balancer";

// Replaced at bundle time by vite's `define` with procaptcha-bundle's own
// package version. `PROSOPO_PACKAGE_VERSION` is not used because a
// self-hosted build is not guaranteed to set it, and the version is the field
// we need to tell a site it is missing a fix.
declare const __PROSOPO_BUNDLE_VERSION__: string | undefined;

export const USAGE_BEACON_URL = "https://beacon.prosopo.io/v1/b.gif";

/** Chance that one widget render sends a beacon. Sent as `p` so counts scale back up to renders. */
export const USAGE_BEACON_SAMPLE_RATE = 0.001;

/**
 * Written as a static `process.env.X` access so the bundler substitutes it;
 * see `readProviderListOverride` for why a computed lookup would not match.
 */
export const readUsageBeaconSetting = (): string | undefined => {
	try {
		return process.env.PROSOPO_USAGE_BEACON;
	} catch {
		return undefined;
	}
};

export const isUsageBeaconEnabled = (setting: string | undefined): boolean =>
	setting?.trim().toLowerCase() !== "false";

const bundleVersion = (): string =>
	typeof __PROSOPO_BUNDLE_VERSION__ !== "undefined" &&
	__PROSOPO_BUNDLE_VERSION__
		? __PROSOPO_BUNDLE_VERSION__
		: "unknown";

export const usageBeaconUrl = (
	host: string,
	siteKey: string,
	version: string,
	sampleRate: number,
): string =>
	`${USAGE_BEACON_URL}?${new URLSearchParams({
		host,
		sitekey: siteKey,
		v: version,
		p: String(sampleRate),
	})}`;

// `no-referrer` because the Referer header would carry the full page URL,
// and paths can hold tokens; the hostname in the query string is all we keep.
const fetchBeacon = (url: string): void => {
	void fetch(url, {
		mode: "no-cors",
		credentials: "omit",
		keepalive: true,
		referrerPolicy: "no-referrer",
	}).catch(() => undefined);
};

export interface UsageBeaconOptions {
	setting?: string;
	providerList?: string;
	host?: string;
	random?: () => number;
	send?: (url: string) => void;
}

/**
 * Tells Prosopo that a self-hosted widget exists, so self-hosters can be told
 * about new releases and critical fixes. Only builds with
 * `PROSOPO_PROVIDER_LIST` send it, since hosted widgets already reach our
 * providers. Bundling with `PROSOPO_USAGE_BEACON=false` turns it off.
 */
export const sendUsageBeacon = (
	siteKey: string | undefined,
	{
		setting = readUsageBeaconSetting(),
		providerList = readProviderListOverride(),
		host = typeof window !== "undefined" ? window.location.hostname : "",
		random = Math.random,
		send = fetchBeacon,
	}: UsageBeaconOptions = {},
): void => {
	if (!siteKey || !host) return;
	if (!isUsageBeaconEnabled(setting)) return;
	if (!providerList?.trim()) return;
	if (random() >= USAGE_BEACON_SAMPLE_RATE) return;
	try {
		send(
			usageBeaconUrl(host, siteKey, bundleVersion(), USAGE_BEACON_SAMPLE_RATE),
		);
	} catch {
		// A beacon must never break the widget.
	}
};
