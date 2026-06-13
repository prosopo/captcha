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

import { loadI18nextFrontend } from "@prosopo/locale";
import {
	Checkbox,
	TestModeBanner,
	getDefaultEvents,
	isSecureBrowserContext,
	providerRetry,
} from "@prosopo/procaptcha-common";
import {
	CaptchaType,
	type FrictionlessState,
	type ModeType,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import customDetectBot from "./customDetectBot.js";

// Each session uses exactly one solver — chosen by the /frictionless response.
const ProcaptchaLoader = async () =>
	(await import("@prosopo/procaptcha-react")).Procaptcha;
const ProcaptchaPuzzleLoader = async () =>
	(await import("@prosopo/procaptcha-puzzle")).ProcaptchaPuzzle;
const ProcaptchaPowLoader = async () =>
	(await import("@prosopo/procaptcha-pow")).ProcaptchaPow;

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
	container,
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
				loadI18nextFrontend().then((i18n) => {
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

	// Mount the captcha widget that matches the chosen type. Used both for the
	// initial frictionless decision and for the post-pow escalation handoff —
	// in the latter case the FrictionlessState carries the new sessionId minted
	// by the provider when it decided PoW alone wasn't enough.
	const renderForCaptchaType = async (
		captchaType: string,
		frictionlessState: FrictionlessState,
	) => {
		const onEscalate = (
			next: CaptchaType.image | CaptchaType.puzzle,
			newSessionId: string,
		) => {
			void renderForCaptchaType(next, {
				...frictionlessState,
				sessionId: newSessionId,
			});
		};

		if (captchaType === CaptchaType.image) {
			const Procaptcha = await ProcaptchaLoader();
			setComponentToRender(
				<Procaptcha
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
				/>,
			);
		} else if (captchaType === CaptchaType.puzzle) {
			const ProcaptchaPuzzle = await ProcaptchaPuzzleLoader();
			setComponentToRender(
				<ProcaptchaPuzzle
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
				/>,
			);
		} else {
			const ProcaptchaPow = await ProcaptchaPowLoader();
			setComponentToRender(
				<ProcaptchaPow
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
					onEscalate={onEscalate}
				/>,
			);
		}
	};

	const start = async () => {
		// Procaptcha cannot run over plain HTTP (no SubtleCrypto etc.), which
		// would otherwise fail later with a cryptic provider-selection error.
		// Surface a clear, non-retrying message instead.
		if (!isSecureBrowserContext()) {
			const errorMessage = i18n.isInitialized
				? i18n.t("WIDGET.INSECURE_CONTEXT")
				: "Procaptcha requires a secure (HTTPS) connection";
			events.onError(new Error(errorMessage));
			fallOverWithStyle(errorMessage, "WIDGET.INSECURE_CONTEXT");
			return;
		}

		await providerRetry(
			async () => {
				stateRef.current.attemptCount += 1;

				const configOutput = ProcaptchaConfigSchema.parse(config);
				const result = await detectBot(configOutput, container, restart);

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
					behaviorCollector1: result.behaviorCollector1,
					behaviorCollector2: result.behaviorCollector2,
					behaviorCollector3: result.behaviorCollector3,
					deviceCapability: result.deviceCapability,
					encryptBehavioralData: result.encryptBehavioralData,
					getSimdReadings: result.getSimdReadings,
					hp: result.hp,
				};

				await renderForCaptchaType(result.captchaType, frictionlessState);

				stateRef.current = {
					...stateRef.current,
					loading: false,
				};
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

	return (
		<>
			<TestModeBanner siteKey={config.account?.address ?? ""} />
			{componentToRender}
		</>
	);
};
