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

import {
	type IpMode,
	getRandomActiveProvider,
	getRandomProviderFromList,
} from "@prosopo/load-balancer";
import type {
	EnvironmentTypes,
	ProviderSelectRetryContext,
	RandomProvider,
} from "@prosopo/types";

// Inlined rather than importing `sleep` from @prosopo/util so this package
// doesn't take on @prosopo/util as a dependency for a one-liner.
const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

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

// Resolves the provider a widget should talk to. On the first attempt this hits
// the load-balancer's static-DNS endpoint (the normal, healthy path — keeps
// session creation and submission pinned to the same backend). On a retry
// (`retryContext.attempt > 1`) the previous provider errored, so instead of
// re-hitting the same possibly-down endpoint we pick a random *different*
// provider straight from the provider list. In development the list holds only
// the single local provider, so a retry just re-targets that provider.
//
// Kept as a separate export so widget packages (procaptcha, procaptcha-pow, …)
// import from procaptcha-common rather than reaching into load-balancer.
export const getProcaptchaRandomActiveProvider = async (
	defaultEnvironment: EnvironmentTypes,
	ipMode?: IpMode,
	retryContext?: ProviderSelectRetryContext,
): Promise<RandomProvider> => {
	if (!retryContext || retryContext.attempt <= 1) {
		return getRandomActiveProvider(defaultEnvironment, ipMode);
	}
	return getRandomProviderFromList(
		defaultEnvironment,
		ipMode,
		retryContext.excludeUrl,
	);
};

// Exponential-backoff-with-jitter bounds for provider retries. The delay grows
// 0.5s → 1s → 2s → 4s … capped at 10s. Without a delay a widget whose provider
// is down re-requests as fast as the event loop allows, and a fleet of such
// widgets can accidentally DDoS the provider fleet. Full jitter (a random point
// in [0, cap]) desynchronises clients that all errored at once so their retries
// don't reconverge into a thundering herd.
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 10_000;

export const getRetryDelayMs = (
	attemptCount: number,
	random: () => number = Math.random,
): number => {
	const safeAttempt = Math.max(0, Math.floor(attemptCount));
	const cappedDelay = Math.min(
		RETRY_MAX_DELAY_MS,
		RETRY_BASE_DELAY_MS * 2 ** safeAttempt,
	);
	return Math.round(random() * cappedDelay);
};

export const providerRetry = async (
	currentFn: () => Promise<void>,
	retryFn: () => Promise<void>,
	stateReset: () => void,
	attemptCount: number,
	retryMax: number,
	backoffMs: number = getRetryDelayMs(attemptCount),
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
		// Back off before retrying so a down provider isn't hammered as fast as
		// the event loop allows (accidental self-inflicted DDoS).
		await sleep(backoffMs);
		// trigger a retry — the managers select a fresh random provider on retry
		await retryFn();
	}
};
