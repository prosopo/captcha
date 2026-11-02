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
	maxElapsedMs?: number;
	onRetry?: (event: {
		attempt: number;
		delayMs: number;
		err: unknown;
	}) => void;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
	random?: () => number;
};

const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 5_000;
// Bounded so a permanent fault such as bad credentials still exits and shows
// up as a failed deploy, rather than a container that looks up but never serves.
const DEFAULT_MAX_ELAPSED_MS = 5 * 60_000;

const defaultSleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	{
		initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
		maxDelayMs = DEFAULT_MAX_DELAY_MS,
		maxElapsedMs = DEFAULT_MAX_ELAPSED_MS,
		onRetry,
		sleep = defaultSleep,
		now = Date.now,
		random = Math.random,
	}: RetryOptions = {},
): Promise<T> {
	const startedAt = now();
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
			if (now() - startedAt + delayMs > maxElapsedMs) {
				throw err;
			}
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
