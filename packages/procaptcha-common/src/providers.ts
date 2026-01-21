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

/**
 * Returns a static DNS endpoint for the given environment.
 * DNS-based load balancing is handled at the DNS level.
 *
 * @param defaultEnvironment - The environment (development, staging, production)
 * @returns Provider information with DNS endpoint
 */
export const getProcaptchaRandomActiveProvider = async (
	defaultEnvironment: EnvironmentTypes,
): Promise<RandomProvider> => {
	let url: string;

	switch (defaultEnvironment) {
		case "development":
			url = "http://localhost:9229";
			break;
		case "staging":
			url = "https://staging.pronode.prosopo.io";
			break;
		case "production":
			url = "https://pronode.prosopo.io";
			break;
		default:
			url = "http://localhost:9229";
	}

	return {
		providerAccount: "provider-dns-endpoint", // Placeholder, actual provider determined by DNS
		provider: {
			url,
		},
	};
};

export const providerRetry = async (
	currentFn: () => Promise<void>,
	retryFn: () => Promise<void>,
	stateReset: () => void,
	attemptCount: number,
	retryMax: number,
) => {
	try {
		await currentFn();
	} catch (err) {
		if (attemptCount >= retryMax) {
			console.error(err);
			console.error(
				`Max retries (${attemptCount} of ${retryMax}) reached, aborting`,
			);
			return stateReset();
		}
		console.error(err);
		// hit an error, disallow user's claim to be human
		stateReset();
		// trigger a retry to attempt a new provider until it passes
		await retryFn();
	}
};
