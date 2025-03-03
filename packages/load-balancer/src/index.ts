// Copyright 2021-2025 Prosopo (UK) Ltd.
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

export type HardcodedProvider = {
	address: string;
	url: string;
	datasetId: string;
};

type hostedProviders = Record<string, HardcodedProvider>;

const convertHostedProvider = (
	provider: hostedProviders,
): HardcodedProvider[] => {
	return Object.values(provider);
};

export const loadBalancer = async (
	environment: EnvironmentTypes,
): Promise<HardcodedProvider[]> => {
	if (environment === "production") {
		const providers: hostedProviders = await fetch(
			"https://provider-list.prosopo.io/",
			{
				method: "GET",
				mode: "cors",
			},
		).then((res) => res.json());
		return convertHostedProvider(providers);
	}
	if (environment === "staging") {
		const providers: hostedProviders = await fetch(
			"https://provider-list.prosopo.io/staging.json",
			{ method: "GET", mode: "cors" },
		).then((res) => res.json());
		return convertHostedProvider(providers);
	}
	if (environment === "development") {
		return [
			{
				address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				url: "https://pronode4old.prosopo.io",
				datasetId:
					"0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
			},
		];
	}

	throw new ProsopoEnvError("CONFIG.UNKNOWN_ENVIRONMENT", {
		context: { environment },
	});
};
