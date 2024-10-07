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

	if (!config.account.address) {
		throw new Error("Hugh resolve this error!");
	}

	// Get random active provider
	const provider = await getRandomActiveProvider(config);
	const providerApi = new ProviderApi(
		provider.provider.url,
		config.account.address,
	);

	if (!config.account.address) {
		throw new Error("Hugh resolve this error!");
	}

	const captcha = await providerApi.getFrictionlessCaptcha(
		botScore.token,
		config.account.address,
	);

	console.log("captcha", captcha);

	return {
		captchaType: captcha.captchaType,
		sessionId: captcha.sessionId,
		provider: provider,
		status: captcha.status,
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

				if (result.captchaType === "image") {
					setComponentToRender(
						<Procaptcha config={config} callbacks={callbacks} />,
					);
				} else {
					const frictionlessState: FrictionlessState = {
						provider: result.provider,
						sessionId: result.sessionId,
					};
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
