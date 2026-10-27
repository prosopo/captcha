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
 * `customDetectBot`, which only runs once the widget has mounted — and
 * that mount sits behind the bundle's dynamic-import chain. Measured on a
 * staging demo page the assign request did not leave the browser until 1513 ms,
 * of which ~700 ms was purely waiting for chunks to arrive in sequence.
 *
 * Nothing in the request depends on the widget, i18n or its config: it needs
 * the site key (a DOM attribute, readable immediately), the environment (a
 * build-time constant), the IP-mode flags and the site's language (DOM
 * attributes). So the entry point kicks it off as soon as it has read those,
 * and `customDetectBot` picks up the in-flight promise instead of starting its
 * own.
 *
 * Every widget on the page for the same key claims the same assignment, so a
 * page with one widget per form costs one assign rather than one per widget.
 * That is safe because `detectorSessionId` only tells the provider which
 * bundle's keys decrypt the readings, and every claimant runs that bundle. A
 * retry never claims (see `customDetectBot`), a failed prefetch drops itself,
 * and an entry older than PREFETCH_TTL_MS is replaced, so no claimant inherits
 * a failed or aged provider pin.
 */

import { ProviderApi } from "@prosopo/api";
import { type Language, widgetLanguageHeaders } from "@prosopo/locale";
import { getProcaptchaRandomActiveProvider } from "@prosopo/procaptcha-common";
import {
	type AssignDetectorBundleResponse,
	type EnvironmentTypes,
	type RandomProvider,
	integrationHeaders,
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

const PREFETCH_TTL_MS = 60_000;

const keyOf = (
	environment: EnvironmentTypes,
	ipMode: IpModeParam,
	siteKey: string,
): string => `${environment}|${ipMode ?? "auto"}|${siteKey}`;

const freshEntry = (key: string): PrefetchEntry | undefined => {
	const entry = inFlight.get(key);
	if (entry && Date.now() - entry.startedAt > PREFETCH_TTL_MS) {
		inFlight.delete(key);
		return undefined;
	}
	return entry;
};

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
	language?: Language,
	integration?: string,
): void => {
	const key = keyOf(environment, ipMode, siteKey);
	if (freshEntry(key)) return;
	const startedAt = Date.now();

	const promise = (async (): Promise<PrefetchedDetector> => {
		const provider = await getProcaptchaRandomActiveProvider(
			environment,
			ipMode,
		);
		const providerApi = new ProviderApi(
			provider.provider.url,
			siteKey,
			undefined,
			{
				...widgetLanguageHeaders(language),
				...integrationHeaders(integration),
			},
		);
		const assigned = await providerApi.assignDetectorBundle(siteKey);
		return { provider, assigned };
	})();

	// Besides dropping a failed entry, this catch stops it surfacing as an
	// unhandled rejection; claimants still see the rejection on the original
	// promise and fall back.
	promise.catch(() => {
		if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
	});
	inFlight.set(key, { promise, startedAt });
};

/**
 * Claim the prefetched assignment for this exact key, if one is still fresh.
 * The entry stays in place so every widget on the page shares it.
 */
export const takePrefetchedDetector = (
	environment: EnvironmentTypes,
	ipMode: IpModeParam,
	siteKey: string,
): Promise<PrefetchedDetector> | undefined =>
	freshEntry(keyOf(environment, ipMode, siteKey))?.promise;

/** Test seam — drops any in-flight prefetches. */
export const clearPrefetchedDetectors = (): void => {
	inFlight.clear();
};
