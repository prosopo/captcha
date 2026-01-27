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
import { getRandomActiveProvider } from "@prosopo/load-balancer";
import { ExtensionLoader } from "@prosopo/procaptcha-common";
import type {
	BotDetectionFunction,
	ProcaptchaClientConfigOutput,
} from "@prosopo/types";
import type { BotDetectionFunctionResult } from "@prosopo/types";
import { DetectorLoader } from "./detectorLoader.js";

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
	const ext = new (await ExtensionLoader(config.web2))();

	const detect = await DetectorLoader();
	const detectionResult = await detect(
		config.defaultEnvironment,
		getRandomActiveProvider,
		container,
		restartFn,
		() => ext.getAccount(config),
	);

	const userAccount = detectionResult.userAccount;

	if (!config.account.address) {
		throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
	}

	// Get random active provider with timeout
	const provider = detectionResult.provider;

	if (!provider) {
		throw new Error("Provider Selection Failed");
	}

	const providerApi = new ProviderApi(
		provider.provider.url,
		config.account.address,
	);

	// Get frictionless captcha with timeout
	const captcha = await withTimeout(
		providerApi.getFrictionlessCaptcha(
			detectionResult.token,
			detectionResult.encryptHeadHash,
			config.account.address,
			userAccount.account.address,
		),
		10000, // 10 second timeout
	);

	return {
		captchaType: captcha.captchaType,
		sessionId: captcha.sessionId,
		provider: provider,
		status: captcha.status,
		userAccount: userAccount,
		error: captcha.error,
		// Map specific trackers to generic behavioral collectors
		behaviorCollector1: detectionResult.mouseTracker,
		behaviorCollector2: detectionResult.touchTracker,
		behaviorCollector3: detectionResult.clickTracker,
		deviceCapability: detectionResult.hasTouchSupport,
		encryptBehavioralData: detectionResult.encryptBehavioralData,
		packBehavioralData: detectionResult.packBehavioralData,
	};
};

export default customDetectBot;
