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

import type { EnvironmentTypes, RandomProvider } from "@prosopo/types";
import { type HardcodedProvider, loadBalancer } from "./index.js";

let cachedProviders: HardcodedProvider[] = [];

export function _resetCache() {
	cachedProviders = [];
}

/**
 * Gets the DNS-based provider URL for the given environment.
 * Uses single DNS endpoint with latency-based routing at the DNS level.
 *
 * @param env - The environment (development, staging, production)
 * @param _entropy - (Deprecated) Previously used for provider selection, now ignored as DNS handles load balancing
 * @returns Provider URL and account information
 */
export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
	_entropy?: number,
): Promise<RandomProvider> => {
	// DNS handles the load balancing now, entropy parameter is ignored

	if (env === "development") {
		// Development uses localhost
		return {
			providerAccount: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
			provider: {
				url: "http://localhost:9229",
			},
		};
	}

	// Get provider list to extract account info
	if (cachedProviders.length === 0) {
		cachedProviders = await loadBalancer(env);
	}

	// Use the first provider's account info (they should all be the same cluster)
	const firstProvider = cachedProviders[0];
	if (!firstProvider) {
		throw new Error("No providers available");
	}

	// Use DNS-based endpoint
	const dnsUrl =
		env === "staging"
			? "https://staging.pronode.prosopo.io"
			: "https://pronode.prosopo.io";

	return {
		providerAccount: firstProvider.address,
		provider: {
			url: dnsUrl,
		},
	};
};
