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
 * Gets the DNS-based provider URL for the given environment.
 * Uses single DNS endpoint with latency-based routing at the DNS level.
 * Frontend uses this for simple provider access without needing the full provider list.
 *
 * @param env - The environment (development, staging, production)
 * @returns Provider URL and placeholder account information
 */
export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
): Promise<RandomProvider> => {
	// DNS handles the load balancing now - no need to fetch provider list for frontend

	let url: string;

	switch (env) {
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
		providerAccount: "dns-load-balanced-provider", // Placeholder - actual provider determined by DNS
		provider: {
			url,
		},
	};
};
