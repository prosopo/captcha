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

import { loadI18next } from "@prosopo/locale";
import {
	Checkbox,
	getDefaultEvents,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import {
	type FrictionlessState,
	type ModeType,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import customDetectBot from "./customDetectBot.js";

const renderPlaceholder = (
	theme: string | undefined,
	mode: ModeType,
	errorMessage: string | undefined,
	isTranslationLoaded: boolean,
	translationFn: (key: string) => string,
	loading: boolean,
) => {
	const checkboxTheme = "light" === theme ? lightTheme : darkTheme;

	if (mode === "invisible") {
		return null;
	}

	return (
		<Checkbox
			theme={checkboxTheme}
			onChange={async () => {}}
			checked={false}
			labelText={isTranslationLoaded ? translationFn("WIDGET.I_AM_HUMAN") : ""}
			error={errorMessage}
			aria-label="human checkbox"
			loading={loading}
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
	i18n,
	detectBot = customDetectBot,
}: ProcaptchaFrictionlessProps) => {
	const stateRef = useRef(defaultLoadingState(0));
	const events = getDefaultEvents(callbacks);

	useEffect(() => {
		if (config.language) {
			if (i18n) {
				if (i18n.language !== config.language) {
					i18n.changeLanguage(config.language).then((r) => r);
				}
			} else {
				loadI18next(false).then((i18n) => {
					if (i18n.language !== config.language)
						i18n.changeLanguage(config.language).then((r) => r);
				});
			}
		}
	}, [i18n, config.language]);

	const [componentToRender, setComponentToRender] = useState(
		renderPlaceholder(
			config.theme,
			config.mode,
			stateRef.current.errorMessage,
			i18n.isInitialized,
			i18n.t,
			true,
		),
	);

	const resetState = (attemptCount?: number) => {
		stateRef.current = defaultLoadingState(
			attemptCount || stateRef.current.attemptCount,
		);
	};

	const fallOverWithStyle = (errorMessage?: string, errorKey?: string) => {
		// We could always re-render here after a period but this will result in never-ending requests to Providers when
		// settings are incorrect, or the user is not human. We need to selectively re-render for events like
		// `no session found` but not for other errors.
		if (errorKey === "CAPTCHA.NO_SESSION_FOUND") {
			setTimeout(() => {
				restartComponentTimeout();
			}, 0);
		}
		setComponentToRender(
			renderPlaceholder(
				config.theme,
				config.mode,
				errorMessage || "Cannot load CAPTCHA",
				i18n.isInitialized,
				i18n.t,
				false,
			),
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
					fallOverWithStyle(result.error?.message, result.error?.key);
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
							i18n={i18n}
						/>,
					);
				} else {
					setComponentToRender(
						<ProcaptchaPow
							config={config}
							callbacks={callbacks}
							frictionlessState={frictionlessState}
							i18n={i18n}
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
