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

import type { EnvironmentTypes, RandomProvider } from "@prosopo/types";
import { at } from "@prosopo/util";
import { type HardcodedProvider, loadBalancer } from "./index.js";

let providers: HardcodedProvider[] = [];

export const getRandomActiveProvider = async (
	env: EnvironmentTypes,
	entropy: number,
): Promise<RandomProvider> => {
	if (providers.length === 0) {
		// only get the providers JSON once
		providers = await loadBalancer(env);
	}

	const randomProvderObj = at(
		providers,
		entropy % Math.max(providers.length - 1, 1),
	);
	return {
		providerAccount: randomProvderObj.address,
		provider: {
			url: randomProvderObj.url,
			datasetId: randomProvderObj.datasetId,
		},
	};
};
