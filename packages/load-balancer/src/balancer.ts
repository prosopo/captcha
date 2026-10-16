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
import { ProsopoEnvError } from "@prosopo/common";
import type { EnvironmentTypes } from "@prosopo/types";
import { getDevelopmentProviderUrl } from "./developmentProviderUrl.js";
import { readProviderListOverride } from "./providerUrlOverride.js";

export interface HardcodedProvider {
	address: string;
	url: string;
	datasetId: string;
	weight: number;
}

/**
 * The provider list is fetched JSON, so entries are checked rather than
 * trusted. Hand-written rather than a zod schema: this module is on the
 * widget's critical path and zod costs 14KB gzipped to validate three strings
 * and a number.
 */
const parseHardcodedProvider = (value: unknown): HardcodedProvider => {
	const entry = value as Record<string, unknown>;
	if (
		!isProviderRecord(value) ||
		typeof entry.address !== "string" ||
		typeof entry.url !== "string" ||
		typeof entry.datasetId !== "string" ||
		(entry.weight !== undefined && typeof entry.weight !== "number")
	) {
		// A plain Error, as before: zod threw an untranslated ZodError here,
		// and a malformed provider list is a deployment fault rather than
		// something to show a visitor.
		throw new Error(
			`Malformed provider entry in the provider list: ${JSON.stringify(value)}`,
		);
	}

	return {
		address: entry.address,
		url: entry.url,
		datasetId: entry.datasetId,
		// weight coerced to int 1-100
		weight: Math.max(1, Math.min(100, Math.round(entry.weight ?? 1))),
	};
};

export type IpMode = "ipv4" | "ipv6";

// Top-level keys reserved by providerListJson for the ipv4-only / ipv6-only
// sub-lists. They appear alongside the dual-stack provider entries in the
// fetched JSON; the converter skips them so existing dual-stack consumers
// keep working.
const IP_MODE_KEYS: ReadonlyArray<IpMode> = ["ipv4", "ipv6"];

type hostedProviders = Record<string, unknown>;

const isProviderRecord = (value: unknown): value is hostedProviders =>
	typeof value === "object" && value !== null;

export const convertHostedProvider = (
	provider: hostedProviders,
	ipMode?: IpMode,
): HardcodedProvider[] => {
	const source =
		ipMode && isProviderRecord(provider[ipMode])
			? (provider[ipMode] as hostedProviders)
			: provider;

	const providers = Object.entries(source)
		.filter(([key]) => !IP_MODE_KEYS.includes(key as IpMode))
		.map(([, value]) => parseHardcodedProvider(value));
	return providers.sort((a, b) => a.url.localeCompare(b.url));
};

// Strip the leading `ipv4.` / `ipv6.` label that providerListJson prepends for
// the single-stack sub-lists so callers can derive a stable identity from the
// provider URL regardless of which ipMode was requested.
export const stripIpModeLabel = (hostname: string): string =>
	hostname.replace(/^ipv[46]\./, "");

export const getProviderHostname = (provider: HardcodedProvider): string =>
	stripIpModeLabel(new URL(provider.url).hostname);

// Placeholders for the fields a bare-URL override cannot supply. `address`
// surfaces as `RandomProvider.providerAccount`, which the DNS-routed
// production path already fills with a constant rather than a real account;
// `datasetId` is vestigial on this path because clients stopped sending one
// and the provider falls back to its own most-recently-loaded dataset.
const SELF_HOSTED_ADDRESS = "self-hosted";
const SELF_HOSTED_DATASET_ID = "";

const stripTrailingSlash = (url: string): string => url.replace(/\/$/, "");

const providersFromUrlList = (raw: string): HardcodedProvider[] =>
	raw
		.split(",")
		.map((url) => stripTrailingSlash(url.trim()))
		.filter((url) => url.length > 0)
		.map((url) => ({
			address: SELF_HOSTED_ADDRESS,
			url,
			datasetId: SELF_HOSTED_DATASET_ID,
			weight: 1,
		}));

/**
 * Parses `PROSOPO_PROVIDER_LIST` into providers, or returns empty when unset.
 *
 * Two accepted forms:
 *
 *   - The same JSON the hosted provider list serves, so weights and the
 *     `ipv4` / `ipv6` sub-lists behave identically. See the README.
 *   - One or more bare URLs, comma-separated, for a deployment that has
 *     nothing to say about weights or addresses.
 *
 * Trailing slashes are stripped throughout: a token embeds the provider URL
 * it was minted against and `@prosopo/server` finds the issuer by exact
 * string match, so `https://host/` and `https://host` must not disagree.
 *
 * A malformed override returns empty rather than throwing, falling back to
 * normal discovery. Throwing would take every captcha on the page down over
 * what is a deployment-time typo.
 */
export const getProviderListOverride = (
	raw: string | undefined = readProviderListOverride(),
	ipMode?: IpMode,
): HardcodedProvider[] => {
	const trimmed = raw?.trim();
	if (!trimmed) return [];

	// Anything not starting an object is the bare-URL shorthand.
	if (!trimmed.startsWith("{")) return providersFromUrlList(trimmed);

	try {
		return convertHostedProvider(JSON.parse(trimmed), ipMode).map(
			(provider) => ({
				...provider,
				url: stripTrailingSlash(provider.url),
			}),
		);
	} catch {
		return [];
	}
};

export const getLoadBalancerUrl = (environment: EnvironmentTypes): string => {
	if (environment === "production") {
		return "https://provider-list.prosopo.io/";
	}
	if (environment === "staging") {
		return "https://provider-list.prosopo.io/staging.json";
	}
	throw new ProsopoEnvError("CONFIG.UNKNOWN_ENVIRONMENT", {
		context: { environment },
	});
};

/**
 * Upper bound on the provider-list fetch. `@prosopo/server` calls
 * `loadBalancer` on every `isVerified`, so a stalled list endpoint would
 * otherwise hold the site owner's request open for the runtime's default
 * (~300s in undici).
 */
export const PROVIDER_LIST_FETCH_TIMEOUT_MS = 10_000;

const timeoutSignal = (timeoutMs: number): AbortSignal | undefined =>
	// Older browsers running the widget lack AbortSignal.timeout; there the
	// fetch keeps its previous unbounded behaviour rather than throwing.
	typeof AbortSignal !== "undefined" &&
	typeof AbortSignal.timeout === "function"
		? AbortSignal.timeout(timeoutMs)
		: undefined;

export const loadBalancer = async (
	environment: EnvironmentTypes,
	ipMode?: IpMode,
	timeoutMs: number = PROVIDER_LIST_FETCH_TIMEOUT_MS,
): Promise<HardcodedProvider[]> => {
	// An override supplies the whole list. Checked before the environment
	// branches so a self-hosted deployment answers for `production` too, and
	// ahead of the fetch so no request reaches Prosopo's hosted list at all.
	// `ipMode` is honoured only for the JSON form, which can carry its own
	// `ipv4` / `ipv6` sub-lists; the bare-URL form ignores it, because those
	// labels are a property of our fleet's DNS and prefixing `ipv4.` onto
	// someone else's hostname would resolve to nothing.
	const override = getProviderListOverride(undefined, ipMode);
	if (override.length > 0) return override;

	if (environment === "development") {
		return [
			{
				address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				url: getDevelopmentProviderUrl(),
				datasetId:
					"0x7984714b92d61fd92fd6a7bc9b56b729481470bcc771c19c382ec679acf02e67",
				weight: 1,
			},
		];
	}

	const providers: hostedProviders = await fetch(
		getLoadBalancerUrl(environment),
		{
			method: "GET",
			mode: "cors",
			signal: timeoutSignal(timeoutMs),
		},
	).then((res) => res.json());
	// `ipMode` steers `convertHostedProvider` at the fetched JSON's
	// `ipv4` / `ipv6` sub-object rather than the dual-stack default,
	// so tokens minted with a single-stack sub-zone URL find their
	// entry — see the `detectIpMode` doc-comment in @prosopo/server.
	return convertHostedProvider(providers, ipMode);
};
