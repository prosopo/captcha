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

import { ExtensionWeb2 } from "@prosopo/account";
import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import detect from "@prosopo/detector";
import { getRandomActiveProvider } from "@prosopo/procaptcha-common";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import {
	type BotDetectionFunction,
	type FrictionlessState,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
} from "@prosopo/types";
import { ProcaptchaPlaceholder } from "@prosopo/web-components";
import { useEffect, useState } from "react";

const customDetectBot: BotDetectionFunction = async (
	config: ProcaptchaClientConfigOutput,
) => {
	const botScore: { token: string } = await detect();

	const userAccount = await new ExtensionWeb2().getAccount(config);

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
	};
};

export const ProcaptchaFrictionless = ({
	config,
	callbacks,
	detectBot = customDetectBot,
}: ProcaptchaFrictionlessProps) => {
	const [componentToRender, setComponentToRender] = useState(
		<ProcaptchaPlaceholder config={config} callbacks={callbacks} />,
	);

	useEffect(() => {
		const configOutput = ProcaptchaConfigSchema.parse(config);

		const detectAndSetComponent = async () => {
			try {
				const result = await detectBot(configOutput);

				const frictionlessState: FrictionlessState = {
					provider: result.provider,
					sessionId: result.sessionId,
					userAccount: result.userAccount,
				};

				if (result.captchaType === "image") {
					setComponentToRender(
						<Procaptcha
							config={config}
							callbacks={callbacks}
							frictionlessState={frictionlessState}
						/>,
					);
				} else {
					setComponentToRender(
						<ProcaptchaPow
							config={config}
							callbacks={callbacks}
							frictionlessState={frictionlessState}
						/>,
					);
				}
			} catch (error) {
				console.error(error);
				setComponentToRender(
					<Procaptcha config={config} callbacks={callbacks} />,
				);
			}
		};

		detectAndSetComponent();
	}, [config, callbacks, detectBot, config.language]);

	return componentToRender;
};
