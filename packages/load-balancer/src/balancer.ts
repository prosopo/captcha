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
import { z } from "zod";

const HardcodedProviderSchema = z.object({
	address: z.string(),
	url: z.string(),
	datasetId: z.string(),
	weight: z
		.number()
		.optional()
		.default(1)
		.transform((val) => {
			// weight coerced to int 1-100
			const weight = Math.round(val);
			return Math.max(1, Math.min(100, weight));
		}),
});

export type HardcodedProvider = z.infer<typeof HardcodedProviderSchema>;

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
		.map(([, value]) => HardcodedProviderSchema.parse(value));
	return providers.sort((a, b) => a.url.localeCompare(b.url));
};

// Strip the leading `ipv4.` / `ipv6.` label that providerListJson prepends for
// the single-stack sub-lists so callers can derive a stable identity from the
// provider URL regardless of which ipMode was requested.
export const stripIpModeLabel = (hostname: string): string =>
	hostname.replace(/^ipv[46]\./, "");

export const getProviderHostname = (provider: HardcodedProvider): string =>
	stripIpModeLabel(new URL(provider.url).hostname);

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

export const loadBalancer = async (
	environment: EnvironmentTypes,
	ipMode?: IpMode,
): Promise<HardcodedProvider[]> => {
	if (environment === "development") {
		return [
			{
				address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				url: "https://localhost:9229",
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
		},
	).then((res) => res.json());
	return convertHostedProvider(providers, ipMode);
};
