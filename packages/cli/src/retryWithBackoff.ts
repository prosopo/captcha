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

import type { ProviderEnvironment } from "@prosopo/env";

export type RetryOptions = {
	initialDelayMs?: number;
	maxDelayMs?: number;
	onRetry?: (event: {
		attempt: number;
		delayMs: number;
		err: unknown;
	}) => void;
	sleep?: (ms: number) => Promise<void>;
	random?: () => number;
};

const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 5_000;

const defaultSleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

// Never gives up: an outage of any length must end with the provider serving
// again, with no restart or operator involved.
export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	{
		initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
		maxDelayMs = DEFAULT_MAX_DELAY_MS,
		onRetry,
		sleep = defaultSleep,
		random = Math.random,
	}: RetryOptions = {},
): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await operation();
		} catch (err) {
			const ceilingMs = Math.min(
				maxDelayMs,
				initialDelayMs * 2 ** (attempt - 1),
			);
			// Half fixed, half random: the two providers on a node start together
			// and should not hit a recovering datastore in lockstep.
			const delayMs = Math.round(ceilingMs / 2 + random() * (ceilingMs / 2));
			onRetry?.({ attempt, delayMs, err });
			await sleep(delayMs);
		}
	}
}

export const waitForEnvironment = (
	env: Pick<ProviderEnvironment, "isReady"> & {
		logger: Pick<ProviderEnvironment["logger"], "warn">;
	},
): Promise<void> =>
	retryWithBackoff(() => env.isReady(), {
		onRetry: ({ attempt, delayMs, err }) => {
			env.logger.warn(() => ({
				msg: "Environment not ready, retrying",
				err,
				data: { attempt, delayMs },
			}));
		},
	});
