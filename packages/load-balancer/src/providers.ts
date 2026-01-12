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
 * Selects a weighted random provider using the entropy value.
 * Providers with higher weights are more likely to be selected.
 *
 * @param providers - Array of providers with weights
 * @param entropy - Random seed value for deterministic selection
 * @returns Selected provider
 */
export function selectWeightedProvider(
	providers: HardcodedProvider[],
	entropy: number,
): HardcodedProvider {
	if (providers.length === 0) {
		throw new Error("No providers available");
	}

	const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);

	// Use entropy to generate a value between 0 and totalWeight-1
	const randomValue = entropy % totalWeight;

	// Select provider based on cumulative weight
	let cumulativeWeight = 0;
	for (const provider of providers) {
		cumulativeWeight += provider.weight;
		if (randomValue < cumulativeWeight) {
			return provider;
		}
	}

	// Fallback (should never reach here)
	const selectedProvider = providers[providers.length - 1];
	if (!selectedProvider) {
		throw new Error("No providers available");
	}
	return selectedProvider;
}

export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
	entropy: number,
): Promise<RandomProvider> => {
	if (cachedProviders.length === 0) {
		// only get the providers JSON once
		cachedProviders = await loadBalancer(env);
	}

	const randomProviderObj = selectWeightedProvider(cachedProviders, entropy);

	return {
		providerAccount: randomProviderObj.address,
		provider: {
			url: randomProviderObj.url,
			datasetId: randomProviderObj.datasetId,
		},
	};
};
