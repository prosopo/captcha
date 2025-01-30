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

import { ExtensionWeb2, ExtensionWeb3 } from "@prosopo/account";
import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import {
	getRandomActiveProvider,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import {
	type BotDetectionFunction,
	type FrictionlessState,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
} from "@prosopo/types";
import { ProcaptchaPlaceholder } from "@prosopo/web-components";
import { useEffect, useState, useRef } from "react";

const DetectorLoader = async () => (await import("@prosopo/detector")).default;
const ExtensionLoader = async (web2: boolean) =>
	web2
		? (await import("@prosopo/account")).ExtensionWeb2
		: (await import("@prosopo/account")).ExtensionWeb3;

const customDetectBot: BotDetectionFunction = async (
	config: ProcaptchaClientConfigOutput,
) => {
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

const renderPlaceholder = ({
	config,
	callbacks,
	errorMessage,
}: ProcaptchaProps) => (
	<ProcaptchaPlaceholder
		config={config}
		callbacks={callbacks}
		errorMessage={errorMessage}
	/>
);

type FrictionlessLoadingState = {
	loading: boolean;
	attemptCount: number;
	errorMessage?: string;
};

const defaultLoadingState = (attemptCount: number): FrictionlessLoadingState => ({
	loading: false,
	attemptCount: 0,
});

export const ProcaptchaFrictionless = ({
	config,
	callbacks,
	detectBot = customDetectBot,
}: ProcaptchaFrictionlessProps) => {
	const state = useRef(defaultLoadingState(0));
	const [componentToRender, setComponentToRender] = useState(
		renderPlaceholder({ config, callbacks, errorMessage: state.errorMessage }),
	);
	const attemptCountRef = useRef(0);

	const resetState = () => {
		state.current = defaultLoadingState(state.current.attemptCount);
		callbacks?.onReset ? callbacks.onReset() : undefined;
	};

	const fallOverWithStyle = () => {
		setComponentToRender(
			renderPlaceholder({ config, callbacks, errorMessage: "asdfasdf im an error" }),
		);
	};

	const start = async () => {
		await providerRetry(
			async () => {
				attemptCountRef.current += 1;

				const configOutput = ProcaptchaConfigSchema.parse(config);
				const result = await detectBot(configOutput);

				if (result.error?.message) {
					state.current = {
						...state.current,
						loading: false,
						errorMessage: result.error?.message,
					};
					throw new Error(result.error?.message);
				}

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

						state.current = {
						...state.current,
						loading: false,
					};
				}
			},
			start,
			resetState,
			attemptCountRef.current,
			2,
		).finally(() => {
			if (state.current.attemptCount >= 2) {
				fallOverWithStyle();
			}
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const detectAndSetComponent = async () => {
			await start();
		};

		detectAndSetComponent();
	}, [config, callbacks, detectBot, config.language]);

	return componentToRender;
};
