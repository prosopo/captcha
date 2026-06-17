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

import { type IpMode, getRandomActiveProvider } from "@prosopo/load-balancer";
import type { EnvironmentTypes } from "@prosopo/types";

// Translate the user-facing ipv4/ipv6 booleans (set via ProcaptchaRenderOptions
// or data-ipv4/data-ipv6) into the load-balancer's IpMode selector. ipv4 wins
// if both are set; neither set leaves DNS in dual-stack mode (undefined).
export const pickIpMode = (
	flags: { ipv4?: boolean; ipv6?: boolean } | undefined,
): IpMode | undefined => {
	if (flags?.ipv4) return "ipv4";
	if (flags?.ipv6) return "ipv6";
	return undefined;
};

export const getProcaptchaRandomActiveProvider = async (
	defaultEnvironment: EnvironmentTypes,
	ipMode?: IpMode,
) => {
	const randomNumberU8a = window.crypto.getRandomValues(new Uint8Array(10));
	const randomNumber = randomNumberU8a.reduce((a, b) => a + b, 0);
	return await getRandomActiveProvider(defaultEnvironment, randomNumber, ipMode);
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
