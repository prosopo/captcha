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

export type RetryOptions = {
	// Total attempts including the first. `1` disables retries.
	maxAttempts: number;
	// Base delay for the first retry — attempt N waits in [0, base * 2^N].
	baseDelayMs: number;
	// Upper bound on the jitter window so backoff can't grow unboundedly.
	maxDelayMs: number;
	// Injectable for deterministic tests. Defaults to Math.random.
	random?: () => number;
	// Injectable for deterministic tests. Defaults to setTimeout-based sleep.
	sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> =>
	ms > 0
		? new Promise((resolve) => setTimeout(resolve, ms))
		: Promise.resolve();

// Full-jitter exponential backoff — attempt N picks a uniform delay in the
// range [0, min(maxDelayMs, baseDelayMs * 2^N)]. Full jitter (rather than
// equal jitter) desynchronises clients that all failed at the same moment,
// so their retries don't reconverge into a thundering herd against whatever
// they're calling. Matches the algorithm in @prosopo/procaptcha-common's
// getRetryDelayMs so both retry paths behave the same way.
export const getBackoffDelayMs = (
	attempt: number,
	baseDelayMs: number,
	maxDelayMs: number,
	random: () => number = Math.random,
): number => {
	const safeAttempt = Math.max(0, Math.floor(attempt));
	const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** safeAttempt);
	return Math.round(random() * cap);
};

/**
 * Run `fn` up to `maxAttempts` times, sleeping with full-jitter exponential
 * backoff between attempts. Returns the first successful value. If every
 * attempt throws, throws the last error (Error-normalised).
 */
export const retryWithBackoff = async <T>(
	fn: () => Promise<T>,
	opts: RetryOptions,
): Promise<T> => {
	const {
		maxAttempts,
		baseDelayMs,
		maxDelayMs,
		random = Math.random,
		sleep = defaultSleep,
	} = opts;
	let lastErr: unknown;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			if (attempt >= maxAttempts - 1) break;
			await sleep(getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs, random));
		}
	}
	throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
};
