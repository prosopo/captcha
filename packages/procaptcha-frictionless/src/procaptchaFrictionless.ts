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

import { loadI18next } from "@prosopo/locale";
import {
	type CheckboxProps,
	type Component,
	type StaticComponent,
	Teardown,
	clearElement,
	createElement,
	getDefaultEvents,
	isSecureBrowserContext,
	mountCheckbox,
	mountTestModeBanner,
	providerRetry,
} from "@prosopo/procaptcha-common";
import {
	CaptchaType,
	type FrictionlessState,
	type ModeType,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import customDetectBot from "./customDetectBot.js";
import {
	type MutableRef,
	type RetryCoords,
	consumeRetryMountProps,
	handleSessionInvalidated,
} from "./sessionInvalidatedRecovery.js";

// Each session uses exactly one solver — chosen by the /frictionless response.
const ProcaptchaLoader = async () =>
	(await import("@prosopo/procaptcha-react")).mountProcaptchaImageWidget;
const ProcaptchaPuzzleLoader = async () =>
	(await import("@prosopo/procaptcha-puzzle")).mountProcaptchaPuzzleWidget;
const ProcaptchaPowLoader = async () =>
	(await import("@prosopo/procaptcha-pow")).mountProcaptchaPowWidget;

/** A mounted solver widget. All three solvers expose the same teardown. */
interface SolverHandle {
	destroy(): void;
}

export interface ProcaptchaFrictionlessHandle {
	destroy(): void;
}

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

export const mountProcaptchaFrictionless = (
	container: HTMLElement,
	props: ProcaptchaFrictionlessProps,
): ProcaptchaFrictionlessHandle => {
	const {
		config,
		callbacks,
		restart,
		i18n,
		detectBot = customDetectBot,
		container: widgetContainer,
	} = props;

	const teardown = new Teardown();
	const events = getDefaultEvents(callbacks);

	let state = defaultLoadingState(0);
	let destroyed = false;

	// Coords carried over from an `onSessionInvalidated` event on the inner
	// widget. Consumed once by the next `renderForCaptchaType` — the resumed
	// widget mounts with `autoStart` + `startCoords` so the user doesn't have
	// to click the checkbox a second time and the checkbox click position is
	// preserved in the eventual solution salt.
	const pendingRetryCoords: MutableRef<RetryCoords | null> = { current: null };
	// One-shot outer guard so a persistently broken session doesn't loop.
	// After we've retried once, a second NO_SESSION_FOUND falls back to the
	// inner widget's own `frictionlessState.restart()` path.
	const sessionInvalidatedFired: MutableRef<boolean> = { current: false };
	const banner: StaticComponent = mountTestModeBanner(container, {
		siteKey: config.account?.address ?? "",
	});

	// The solver (or the placeholder checkbox) renders here. Swapping the slot's
	// contents replaces what the React version did by putting an element in
	// state and letting the reconciler diff it.
	const slot = createElement("div");
	container.appendChild(slot);

	let solver: SolverHandle | undefined;
	let placeholder: Component<CheckboxProps> | undefined;

	const clearSlot = () => {
		solver?.destroy();
		solver = undefined;
		placeholder?.destroy();
		placeholder = undefined;
		clearElement(slot);
	};

	const renderPlaceholder = (
		mode: ModeType,
		errorMessage: string | undefined,
		loading: boolean,
	) => {
		clearSlot();

		if ("invisible" === mode) {
			return;
		}

		placeholder = mountCheckbox(slot, {
			theme: "light" === config.theme ? lightTheme : darkTheme,
			onChange: async () => {},
			checked: false,
			labelText: i18n.isInitialized ? i18n.t("WIDGET.I_AM_HUMAN") : "",
			error: errorMessage,
			loading,
		});
	};

	const resetState = (attemptCount?: number) => {
		state = defaultLoadingState(attemptCount || state.attemptCount);
	};

	const restartComponentTimeout = () => {
		const timer = setTimeout(() => {
			resetState(0);
			events.onReset();
			// `restart` frictionless widget after 10 seconds
			restart();
		}, 10000);
		teardown.add(() => clearTimeout(timer));
	};

	const fallOverWithStyle = (errorMessage?: string, errorKey?: string) => {
		// We could always re-render here after a period but this will result in
		// never-ending requests to Providers when settings are incorrect, or the
		// user is not human. We need to selectively re-render for events like
		// `no session found` but not for other errors.
		if ("CAPTCHA.NO_SESSION_FOUND" === errorKey) {
			const timer = setTimeout(() => {
				restartComponentTimeout();
			}, 0);
			teardown.add(() => clearTimeout(timer));
		}
		renderPlaceholder(
			config.mode,
			errorMessage || "Cannot load CAPTCHA",
			false,
		);
	};

	// Mount the captcha widget that matches the chosen type. Used both for the
	// initial frictionless decision and for the post-pow escalation handoff —
	// in the latter case the FrictionlessState carries the new sessionId minted
	// by the provider when it decided PoW alone wasn't enough.
	const renderForCaptchaType = async (
		captchaType: string,
		frictionlessState: FrictionlessState,
		autoStart = false,
		escalationCoords?: RetryCoords,
	): Promise<void> => {
		const onEscalate = (
			next: CaptchaType.image | CaptchaType.puzzle,
			newSessionId: string,
			coords?: RetryCoords,
		) => {
			void renderForCaptchaType(
				next,
				{
					...frictionlessState,
					sessionId: newSessionId,
				},
				true,
				coords,
			);
		};

		// The provider returned NO_SESSION_FOUND on the inner widget's
		// challenge fetch — the sessionId minted upstream is no longer usable
		// (usually because a duplicate /captcha/{type} POST from a WebView
		// mount storm consumed it first). Re-run the frictionless flow to
		// mint a fresh session, then re-mount the inner widget with the
		// preserved checkbox click coords so the user is not asked to click a
		// second time. One-shot per outer widget lifetime — if the retry
		// also fails, fall through to the inner widget's existing
		// `frictionlessState.restart()` path.
		const onSessionInvalidated = (x?: number, y?: number) => {
			const { shouldRestart } = handleSessionInvalidated(
				x,
				y,
				sessionInvalidatedFired,
				pendingRetryCoords,
			);
			if (!shouldRestart) return;
			resetState(0);
			void start();
		};

		// Consume any pending retry coords now — the resumed widget owns them
		// for exactly one auto-fired `manager.start(x, y)`. Cleared so a
		// subsequent escalation/re-render doesn't accidentally re-inject.
		// Escalation coords (from a PoW→image/puzzle handoff) take precedence
		// over pending retry coords when both are present, because escalation
		// is the current transition and the pending retry belongs to a prior
		// widget instance that never got to consume them.
		const { autoStart: resumedAutoStart, startCoords: retryStartCoords } =
			consumeRetryMountProps(pendingRetryCoords, autoStart);
		const startCoords = escalationCoords ?? retryStartCoords;

		const widgetProps: ProcaptchaProps = {
			config,
			callbacks,
			frictionlessState,
			i18n,
			autoStart: resumedAutoStart,
			startCoords,
			onSessionInvalidated,
		};

		if (CaptchaType.image === captchaType) {
			const mount = await ProcaptchaLoader();
			if (destroyed) return;
			clearSlot();
			solver = mount(slot, widgetProps);
			return;
		}

		if (CaptchaType.puzzle === captchaType) {
			const mount = await ProcaptchaPuzzleLoader();
			if (destroyed) return;
			clearSlot();
			solver = mount(slot, widgetProps);
			return;
		}

		const mount = await ProcaptchaPowLoader();
		if (destroyed) return;
		clearSlot();
		solver = mount(slot, { ...widgetProps, onEscalate });
	};

	const start = async (): Promise<void> => {
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
				state.attemptCount += 1;

				const configOutput = ProcaptchaConfigSchema.parse(config);
				// After the first attempt, tell detection this is a retry so it
				// re-selects a random provider from the list rather than re-using
				// the DNS-routed pronode that just failed.
				const result = await detectBot(configOutput, widgetContainer, restart, {
					attempt: state.attemptCount,
				});

				if (result.error?.message) {
					state = {
						...state,
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

				state = {
					...state,
					loading: false,
				};
			},
			start,
			resetState,
			state.attemptCount,
			5,
		).finally(() => {
			if (state.attemptCount >= 5) {
				fallOverWithStyle();
				restartComponentTimeout();
			}
		});
	};

	if (config.language) {
		if (i18n) {
			if (i18n.language !== config.language) {
				void i18n.changeLanguage(config.language);
			}
		} else {
			// Direct consumers don't go through WidgetFactory, so pass the language
			// into loadI18next — first init boots with the right language (skipping
			// browser detection), and subsequent calls reconcile via changeLanguage
			// inside loadI18next.
			void loadI18next(false, config.language);
		}
	}

	// Initial paint: the loading placeholder, before detection resolves.
	renderPlaceholder(config.mode, state.errorMessage, true);

	// One mount, one frictionless call. The React version needed a
	// started-for-identity ref here because a host page recreating `callbacks`
	// (or the whole `config`) on every render re-fired the effect; there is no
	// re-render to guard against now, so mounting is the trigger.
	void start();

	return {
		destroy: () => {
			destroyed = true;
			teardown.run();
			clearSlot();
			banner.destroy();
			slot.parentNode?.removeChild(slot);
		},
	};
};
