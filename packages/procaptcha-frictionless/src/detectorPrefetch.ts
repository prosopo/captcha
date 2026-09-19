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

/**
 * Detector bundle prefetch.
 *
 * Since the detector moved into the provider-served pool, the frictionless flow
 * cannot start until `/detector/assign` has returned. That request is issued by
 * `customDetectBot`, which only runs once React has mounted the widget — and
 * that mount sits behind the bundle's dynamic-import chain. Measured on a
 * staging demo page the assign request did not leave the browser until 1513 ms,
 * of which ~700 ms was purely waiting for chunks to arrive in sequence.
 *
 * Nothing in the request depends on React, i18n or the widget config: it needs
 * the site key (a DOM attribute, readable immediately), the environment (a
 * build-time constant) and the IP-mode flags (DOM attributes). So the entry
 * point kicks it off as soon as it has read those, and `customDetectBot` picks
 * up the in-flight promise instead of starting its own.
 *
 * The cache is deliberately single-use. A provider pin is only valid for the
 * attempt it was made for — on a retry the previous pronode is the one that
 * just failed — so a consumed entry is dropped and the retry re-resolves.
 */

import { ProviderApi } from "@prosopo/api";
import { getProcaptchaRandomActiveProvider } from "@prosopo/procaptcha-common";
import type {
	AssignDetectorBundleResponse,
	EnvironmentTypes,
	RandomProvider,
} from "@prosopo/types";

// `IpMode` is declared in @prosopo/load-balancer, which this package does not
// depend on. Derive it from the selector we already call rather than adding a
// dependency (and a matching tsconfig project reference) for one type alias —
// this also cannot drift from the function's real signature.
type IpModeParam = Parameters<typeof getProcaptchaRandomActiveProvider>[1];

export interface PrefetchedDetector {
	provider: RandomProvider;
	assigned: AssignDetectorBundleResponse;
}

interface PrefetchEntry {
	promise: Promise<PrefetchedDetector>;
	startedAt: number;
}

const inFlight = new Map<string, PrefetchEntry>();

/**
 * How long a started prefetch stays claimable. A page that mounts several
 * widgets does so within a tick or two of each other, so a short window is
 * enough for them to share one assignment; anything mounting much later
 * (a modal opened minutes in, say) re-resolves rather than reusing a provider
 * pin that has since gone stale.
 */
const PREFETCH_TTL_MS = 60_000;

const keyOf = (
	environment: EnvironmentTypes,
	ipMode: IpModeParam,
	siteKey: string,
): string => `${environment}|${ipMode ?? "auto"}|${siteKey}`;

/**
 * Start resolving a provider and assigning a detector bundle. Safe to call more
 * than once for the same key — subsequent calls join the in-flight request.
 *
 * Never rejects to the caller: a failed prefetch is indistinguishable from
 * never having prefetched, and `customDetectBot` already handles assign failure
 * by falling back to PoW. Returning a rejected promise here would surface as an
 * unhandled rejection in the host page.
 */
export const prefetchDetector = (
	environment: EnvironmentTypes,
	ipMode: IpModeParam,
	siteKey: string,
): void => {
	const key = keyOf(environment, ipMode, siteKey);
	if (inFlight.has(key)) return;
	const startedAt = Date.now();

	const promise = (async (): Promise<PrefetchedDetector> => {
		const provider = await getProcaptchaRandomActiveProvider(
			environment,
			ipMode,
		);
		const providerApi = new ProviderApi(provider.provider.url, siteKey);
		const assigned = await providerApi.assignDetectorBundle(siteKey);
		return { provider, assigned };
	})();

	// Attach a no-op catch so a failed prefetch never becomes an unhandled
	// rejection. `takePrefetchedDetector`'s consumer still sees the rejection on
	// the original promise and falls back.
	//
	// Drop the entry if it rejects, so a later widget re-resolves instead of
	// inheriting a pin that has already failed. This is what the previous
	// delete-on-claim was protecting against; doing it on rejection instead
	// keeps that guarantee while letting concurrent widgets share a success.
	promise.catch(() => {
		if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
	});
	inFlight.set(key, { promise, startedAt });
};

/**
 * Claim a prefetched assignment, if one was started for this exact key and is
 * still fresh.
 *
 * The entry is deliberately NOT removed on claim. It used to be, which meant
 * that on a page carrying several widgets only the first shared the prefetch
 * and every other widget issued its own provider resolve + assign. One
 * production integration mounts a widget per form — eight on a property page —
 * so a single page view cost eight assign calls instead of one, enough to push
 * ordinary visitors past a rate detector.
 *
 * Sharing one assignment across widgets is sound: `detectorSessionId` binds to
 * a bundleId in Redis purely so the provider can resolve which cipher keys
 * decrypt that widget's SIMD readings. Widgets sharing an assignment run the
 * same bundle, so the same keys are the right ones. It is a lookup, not a
 * one-shot token.
 *
 * A failed prefetch still removes itself (see `prefetchDetector`), and entries
 * go stale after PREFETCH_TTL_MS, so neither a failed nor an aged provider pin
 * is handed out.
 */
export const takePrefetchedDetector = (
	environment: EnvironmentTypes,
	ipMode: IpModeParam,
	siteKey: string,
): Promise<PrefetchedDetector> | undefined => {
	const key = keyOf(environment, ipMode, siteKey);
	const entry = inFlight.get(key);
	if (!entry) return undefined;
	if (Date.now() - entry.startedAt > PREFETCH_TTL_MS) {
		inFlight.delete(key);
		return undefined;
	}
	return entry.promise;
};

/** Test seam — drops any in-flight prefetches. */
export const clearPrefetchedDetectors = (): void => {
	inFlight.clear();
};
