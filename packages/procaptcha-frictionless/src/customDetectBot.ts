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
} from "@prosopo/types";
import type { BotDetectionFunctionResult } from "@prosopo/types";
import {
	DetectorLoaderFromScript,
	type DetectorType,
} from "./detectorLoader.js";

// Upper bound on the detector-bundle assignment + load probe. The detector
// lives ONLY in the provider-served pool bundles, so if the provider is
// slow/unreachable we abandon the probe and signal `detectorUnavailable`, and
// the provider serves a PoW challenge instead of running detection.
const ASSIGN_TIMEOUT_MS = 2000;

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
): Promise<BotDetectionFunctionResult> => {
	if (!config.account.address) {
		throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
	}

	// Resolve the static DNS endpoint for this env. No client-side random
	// selection anymore — the DNS layer load-balances across the pronode fleet.
	// `pickIpMode(config)` honours the dapp's data-ipv4 / data-ipv6 preference
	// so frictionless and the subsequent captcha hops stay on the same stack.
	// Resolved up front (before detection) so we can ask the provider for a
	// per-session detector bundle.
	const provider = await getProcaptchaRandomActiveProvider(
		config.defaultEnvironment,
		pickIpMode(config),
	);

	const providerApi = new ProviderApi(
		provider.provider.url,
		config.account.address,
	);

	// Ask the provider for a per-session detector bundle. The detector lives ONLY
	// in the provider-served pool: when the provider has a populated pool it
	// returns the obfuscated detector (each with its own keys + inner cipher)
	// plus a detectorSessionId. When it cannot (no pool, network, decode, or
	// timeout) we have NO detector to run — there is no bundled fallback — so we
	// signal `detectorUnavailable` and the provider serves a PoW challenge.
	let detectorSessionId: string | undefined;
	let providerDetect: DetectorType | undefined;
	// DEBUG(detector-pool): remove. Observe the client side of the flow.
	console.log(
		`[POOL-DEBUG] resolved provider ${provider.provider.url}; requesting detector bundle…`,
	);
	try {
		const assigned = await withTimeout(
			providerApi.assignDetectorBundle(config.account.address),
			ASSIGN_TIMEOUT_MS,
		);
		// DEBUG(detector-pool): remove.
		console.log(
			`[POOL-DEBUG] assign response: useProviderBundle=${assigned.useProviderBundle}${assigned.detectorSessionId ? `, detectorSessionId=${assigned.detectorSessionId}` : ""}${assigned.detectorScript ? `, script=${assigned.detectorScript.length} bytes` : ""}`,
		);
		if (assigned.useProviderBundle && assigned.detectorScript) {
			detectorSessionId = assigned.detectorSessionId;
			providerDetect = await withTimeout(
				DetectorLoaderFromScript(assigned.detectorScript),
				ASSIGN_TIMEOUT_MS,
			);
		}
	} catch (err) {
		// No detector available — fall through to the PoW request below.
		// DEBUG(detector-pool): remove.
		console.log(
			"[POOL-DEBUG] assign/provider-bundle load failed → no detector → PoW",
			err,
		);
	}

	const ExtClass = await ExtensionLoader(config.web2);
	const ext = new ExtClass();

	// No provider detector ⇒ no detection is possible. Request a PoW challenge
	// directly: send no token and the detectorUnavailable flag so the provider
	// serves PoW rather than attempting to score an absent payload.
	if (providerDetect === undefined) {
		// DEBUG(detector-pool): remove.
		console.log(
			"[POOL-DEBUG] no provider detector → requesting PoW (detectorUnavailable=true)",
		);
		const userAccount = await ext.getAccount(config);
		const powCaptcha = await withTimeout(
			providerApi.getFrictionlessCaptcha(
				undefined,
				undefined,
				config.account.address,
				userAccount.account.address,
				config.mode,
				undefined,
				undefined,
				true,
			),
			10000,
		);
		if (powCaptcha.dns_url) {
			try {
				void fetch(powCaptcha.dns_url, {
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
			captchaType: powCaptcha.captchaType,
			sessionId: powCaptcha.sessionId,
			provider: provider,
			status: powCaptcha.status,
			userAccount: userAccount,
			error: powCaptcha.error,
			hp: powCaptcha.hp,
		};
	}

	// DEBUG(detector-pool): remove.
	console.log(
		`[POOL-DEBUG] using PROVIDER-SERVED detector (blob import), detectorSessionId=${detectorSessionId}`,
	);
	const detect: DetectorType = providerDetect;

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
		() => ext.getAccount(config),
	);

	const userAccount = detectionResult.userAccount;

	// SIMD readings deliberately omitted from the frictionless hop. The WASM
	// benchmark is a CPU-bound loop that contends with BotScoreWorker if it
	// runs during detection; deferring it until after the POST is in flight
	// lets it complete in the worker thread while the network round-trip
	// burns. Readings still attach on the challenge GET and on solution
	// submit (first-hop-wins server-side).
	const captchaPromise = providerApi.getFrictionlessCaptcha(
		detectionResult.token,
		detectionResult.encryptHeadHash,
		config.account.address,
		userAccount.account.address,
		config.mode,
		undefined,
		detectorSessionId,
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
