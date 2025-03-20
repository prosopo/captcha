// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import {
	Checkbox,
	getDefaultEvents,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import {
	type FrictionlessState,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import customDetectBot from "./customDetectBot.js";
import { useTranslation } from "@prosopo/locale";

const renderPlaceholder = (
	theme: string | undefined,
	errorMessage: string | undefined,
) => {
	const { t } = useTranslation();
	const checkboxTheme = "light" === theme ? lightTheme : darkTheme;

	return (
		<Checkbox
			theme={checkboxTheme}
			onChange={() => {}}
			checked={false}
			labelText={t("WIDGET.I_AM_HUMAN")}
			error={errorMessage}
			aria-label="human checkbox"
		/>
	);
};

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
		renderPlaceholder(config.theme, stateRef.current.errorMessage),
	);

	const resetState = (attemptCount?: number) => {
		stateRef.current = defaultLoadingState(
			attemptCount || stateRef.current.attemptCount,
		);
	};

	const fallOverWithStyle = (errorMessage?: string) => {
		setComponentToRender(
			renderPlaceholder(config.theme, errorMessage || "Cannot load CAPTCHA"),
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
