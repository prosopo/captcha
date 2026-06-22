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

// Static DNS endpoints — load balancing happens at the DNS layer (latency-routed
// A/AAAA records across the pronode fleet). `providerAccount` is a fixed
// placeholder; the real backend identity is established by TLS termination at
// the chosen node and is no longer signalled to clients.
const DNS_ENDPOINT: Record<EnvironmentTypes, string> = {
	development: "http://localhost:9229",
	staging: "https://staging.pronode.prosopo.io",
	production: "https://pronode.prosopo.io",
};

export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
): Promise<RandomProvider> => {
	return {
		providerAccount: "dns-routed",
		provider: {
			url: DNS_ENDPOINT[env] ?? DNS_ENDPOINT.development,
		},
	};
};
