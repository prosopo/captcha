// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { getRandomActiveProvider } from "@prosopo/procaptcha-common";
import { ExtensionLoader } from "@prosopo/procaptcha-common";
import type {
	BotDetectionFunction,
	ProcaptchaClientConfigOutput,
} from "@prosopo/types";
import type { BotDetectionFunctionResult } from "@prosopo/types";
import { DetectorLoader } from "./detectorLoader.js";

const customDetectBot: BotDetectionFunction = async (
	config: ProcaptchaClientConfigOutput,
): Promise<BotDetectionFunctionResult> => {
	const detect = await DetectorLoader();
	const botScore: { token: string } = await detect();
	const ext = new (await ExtensionLoader(config.web2))();
	const userAccount = await ext.getAccount(config);

	if (!config.account.address) {
		throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
	}

	// Get random active provider
	const provider = await getRandomActiveProvider(config);
	const providerApi = new ProviderApi(
		provider.provider.url,
		config.account.address,
	);

	const captcha = await providerApi.getFrictionlessCaptcha(
		botScore.token,
		config.account.address,
		userAccount.account.address,
	);

	return {
		captchaType: captcha.captchaType,
		sessionId: captcha.sessionId,
		provider: provider,
		status: captcha.status,
		userAccount: userAccount,
		error: captcha.error,
	};
};

export default customDetectBot;
