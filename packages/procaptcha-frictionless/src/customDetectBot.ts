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

import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import {
	ExtensionLoader,
	getProcaptchaRandomActiveProvider,
	pickIpMode,
} from "@prosopo/procaptcha-common";
import type {
	BotDetectionFunction,
	ProcaptchaClientConfigOutput,
	ProviderSelectRetryContext,
} from "@prosopo/types";
import type { BotDetectionFunctionResult } from "@prosopo/types";
import { DetectorLoader } from "./detectorLoader.js";

// The page(s) the widget is rendered on, reduced to origin + path.
// Deliberately built from `origin` + `pathname` (never `href`) so the query
// string, fragment, and any embedded `user:pass@` credentials never leave the
// browser — sites routinely carry tokens / session ids / reset codes in those
// parts.
//
// Returns two fields:
//   - `currentUrl`: the top-frame URL as best we can determine it. Same-origin
//     iframes read it directly; cross-origin iframes fall back to
//     `document.referrer`, which the browser fills with the embedding page URL
//     subject to Referrer-Policy. When neither is available the field falls
//     back to the local (iframe) URL so the provider still sees a value.
//   - `iframeUrl`: the widget's own frame URL when we're embedded. Undefined
//     when the widget IS the top frame — nothing to distinguish. Emitted so
//     downstream analytics can separate "Protect's site-wide iframe endpoint"
//     from "the page the user was actually on".
//
// Both fields are undefined in non-browser contexts (SSR / tests) or for
// opaque origins.
const sanitiseHref = (href: string): string | undefined => {
	try {
		const u = new URL(href);
		if (!u.origin || u.origin === "null") return undefined;
		return `${u.origin}${u.pathname || ""}`;
	} catch {
		return undefined;
	}
};

type PageUrls = {
	currentUrl: string | undefined;
	iframeUrl: string | undefined;
};

const getCurrentPageUrls = (): PageUrls => {
	if (typeof window === "undefined" || !window.location) {
		return { currentUrl: undefined, iframeUrl: undefined };
	}
	const local = (() => {
		const { origin, pathname } = window.location;
		if (!origin || origin === "null") return undefined;
		return `${origin}${pathname || ""}`;
	})();

	// Top window — no iframe distinction, report the local URL only.
	if (window === window.top) {
		return { currentUrl: local, iframeUrl: undefined };
	}

	// Same-origin iframe — read the top URL directly.
	try {
		const topHref = window.top?.location?.href;
		const sanitised = topHref ? sanitiseHref(topHref) : undefined;
		if (sanitised) return { currentUrl: sanitised, iframeUrl: local };
	} catch {
		/* cross-origin — fall through */
	}

	// Cross-origin iframe — the embedding page URL comes via referrer,
	// subject to the parent's Referrer-Policy header.
	if (typeof document !== "undefined" && document.referrer) {
		const fromReferrer = sanitiseHref(document.referrer);
		if (fromReferrer) return { currentUrl: fromReferrer, iframeUrl: local };
	}

	// Referrer unavailable — fall back to the iframe URL for `currentUrl` so
	// the provider still sees a value, and echo it as `iframeUrl` so
	// downstream can tell the top frame was not observed.
	return { currentUrl: local, iframeUrl: local };
};

export const withTimeout = async <T>(
	promise: Promise<T>,
	ms: number,
): Promise<T> => {
	let timeoutId: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new ProsopoEnvError("API.UNKNOWN"));
		}, ms);
	});

	try {
		const result = await Promise.race([promise, timeoutPromise]);
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		return result;
	} catch (error) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		throw error;
	}
};

const customDetectBot: BotDetectionFunction = async (
	config: ProcaptchaClientConfigOutput,
	container: HTMLElement | undefined,
	restartFn: () => void,
	retryContext?: ProviderSelectRetryContext,
): Promise<BotDetectionFunctionResult> => {
	const [ExtClass, detect] = await Promise.all([
		ExtensionLoader(config.web2),
		DetectorLoader(),
	]);
	const ext = new ExtClass();

	// Kick off account generation as soon as the ExtensionWeb2 class is
	// loaded, before `detect()` starts. sr25519 keypair derivation runs in
	// the CryptoWorker (see ExtensionWeb2.createAccount), so this fires the
	// worker task at the earliest possible point in the widget lifecycle.
	// Wrapped as a memoised factory so `detect()`'s Promise.all pattern still
	// works and a second call inside detect doesn't re-derive.
	const accountPromise = ext.getAccount(config);
	const accountGenerator = () => accountPromise;

	// The detector bundle still expects the legacy 5-arg signature
	// `(env, randomProviderSelectorFn, container, restart, accountGenerator)`.
	// Until the bundle is rebuilt without the provider selector, hand it a
	// noop selector that resolves to the static DNS endpoint — the detector
	// no longer uses the returned RandomProvider for routing.
	const detectionResult = await detect(
		config.defaultEnvironment,
		async () => getProcaptchaRandomActiveProvider(config.defaultEnvironment),
		container,
		restartFn,
		accountGenerator,
	);

	const userAccount = detectionResult.userAccount;

	if (!config.account.address) {
		throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
	}

	// On the first attempt this resolves the static DNS endpoint for this env —
	// the DNS layer load-balances across the pronode fleet. On a retry
	// (`retryContext.attempt > 1`) the previously used pronode errored, so we
	// pick a random provider straight from the list instead of re-pinning the
	// same one. `pickIpMode(config)` honours the dapp's data-ipv4 / data-ipv6
	// preference so frictionless and the subsequent captcha hops stay on the
	// same stack.
	const provider = await getProcaptchaRandomActiveProvider(
		config.defaultEnvironment,
		pickIpMode(config),
		retryContext,
	);

	const providerApi = new ProviderApi(
		provider.provider.url,
		config.account.address,
	);

	// SIMD readings deliberately omitted from the frictionless hop. The WASM
	// benchmark is a CPU-bound loop that contends with BotScoreWorker if it
	// runs during detection; deferring it until after the POST is in flight
	// lets it complete in the worker thread while the network round-trip
	// burns. Readings still attach on the challenge GET and on solution
	// submit (first-hop-wins server-side).
	const { currentUrl, iframeUrl } = getCurrentPageUrls();
	const captchaPromise = providerApi.getFrictionlessCaptcha(
		detectionResult.token,
		detectionResult.encryptHeadHash,
		config.account.address,
		userAccount.account.address,
		config.mode,
		undefined,
		currentUrl,
		iframeUrl,
	);
	if (detectionResult.getSimdReadings) {
		// Fire-and-forget: triggers the memoised prefetch inside the catcher
		// so the next hop sees a hot benchmark. We never await the result here.
		void detectionResult.getSimdReadings(60_000).catch(() => undefined);
	}
	const captcha = await withTimeout(captchaPromise, 10000);

	// Fire-and-forget DNS observation beacon. Failures swallowed —
	// observation must never break the captcha flow.
	if (captcha.dns_url) {
		try {
			void fetch(captcha.dns_url, {
				method: "GET",
				mode: "no-cors",
				credentials: "omit",
				keepalive: true,
				cache: "no-store",
			}).catch(() => undefined);
		} catch {
			/* swallow */
		}
	}

	return {
		captchaType: captcha.captchaType,
		sessionId: captcha.sessionId,
		provider: provider,
		status: captcha.status,
		userAccount: userAccount,
		error: captcha.error,
		hp: captcha.hp,
		// Map specific trackers to generic behavioral collectors
		behaviorCollector1: detectionResult.mouseTracker,
		behaviorCollector2: detectionResult.touchTracker,
		behaviorCollector3: detectionResult.clickTracker,
		deviceCapability: detectionResult.hasTouchSupport,
		encryptBehavioralData: detectionResult.encryptBehavioralData,
		packBehavioralData: detectionResult.packBehavioralData,
		getSimdReadings: detectionResult.getSimdReadings,
	};
};

export default customDetectBot;
