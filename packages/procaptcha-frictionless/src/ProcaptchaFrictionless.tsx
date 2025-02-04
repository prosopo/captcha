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

import { getDefaultEvents, providerRetry } from "@prosopo/procaptcha-common";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import {
	type FrictionlessState,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
} from "@prosopo/types";
import { ProcaptchaPlaceholder } from "@prosopo/web-components";
import { useEffect, useRef, useState } from "react";
import customDetectBot from "./customDetectBot.js";

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

const defaultLoadingState = (
	attemptCount: number,
): FrictionlessLoadingState => ({
	loading: false,
	attemptCount: attemptCount || 0,
});

export const ProcaptchaFrictionless = ({
	config,
	callbacks,
	restart,
	detectBot = customDetectBot,
}: ProcaptchaFrictionlessProps) => {
	const stateRef = useRef(defaultLoadingState(0));
	const events = getDefaultEvents(callbacks);
	const [componentToRender, setComponentToRender] = useState(
		renderPlaceholder({
			config,
			callbacks,
			errorMessage: stateRef.current.errorMessage,
		}),
	);

	const resetState = (attemptCount?: number) => {
		stateRef.current = defaultLoadingState(
			attemptCount || stateRef.current.attemptCount,
		);
	};

	const fallOverWithStyle = (errorMessage?: string) => {
		setComponentToRender(
			renderPlaceholder({
				config,
				callbacks,
				errorMessage: errorMessage || "Cannot load CAPTCHA",
			}),
		);
	};

	const restartComponentTimeout = () => {
		setTimeout(() => {
			resetState(0);
			events.onReset();
			// `restart` frictionless widget after 10 seconds
			restart();
		}, 10000);
	};

	const start = async () => {
		await providerRetry(
			async () => {
				stateRef.current.attemptCount += 1;

				const configOutput = ProcaptchaConfigSchema.parse(config);
				const result = await detectBot(configOutput);

				if (result.error?.message) {
					stateRef.current = {
						...stateRef.current,
						loading: false,
						errorMessage: result.error?.message,
					};
					events.onError(new Error(result.error?.message));
					fallOverWithStyle(result.error?.message);
					return;
				}

				const frictionlessState: FrictionlessState = {
					provider: result.provider,
					sessionId: result.sessionId,
					userAccount: result.userAccount,
					restart, // Pass restart function
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

					stateRef.current = {
						...stateRef.current,
						loading: false,
					};
				}
			},
			start,
			resetState,
			stateRef.current.attemptCount,
			5,
		).finally(() => {
			if (stateRef.current.attemptCount >= 5) {
				fallOverWithStyle();
				restartComponentTimeout();
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
