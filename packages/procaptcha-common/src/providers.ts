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

import { getRandomActiveProvider } from "@prosopo/load-balancer";
import type { EnvironmentTypes } from "@prosopo/types";

export const getProcaptchaRandomActiveProvider = async (
	defaultEnvironment: EnvironmentTypes,
) => {
	const randomNumberU8a = window.crypto.getRandomValues(new Uint8Array(10));
	const randomNumber = randomNumberU8a.reduce((a, b) => a + b, 0);
	return await getRandomActiveProvider(defaultEnvironment, randomNumber);
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
