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
	PROCAPTCHA_START_EVENT,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaStartEventDetail,
	StartModeEnum,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import { useEffect, useRef, useState } from "react";
import customDetectBot from "./customDetectBot.js";
import { evaluateFrictionlessResult } from "./frictionlessResultGuard.js";
import {
	type RetryCoords,
	consumeRetryMountProps,
	handleSessionInvalidated,
	normaliseRetryCoords,
} from "./sessionInvalidatedRecovery.js";

// Each session uses exactly one solver — chosen by the /frictionless response.
const ProcaptchaLoader = async () =>
	(await import("@prosopo/procaptcha-react")).Procaptcha;
const ProcaptchaPuzzleLoader = async () =>
	(await import("@prosopo/procaptcha-puzzle")).ProcaptchaPuzzle;
const ProcaptchaPowLoader = async () =>
	(await import("@prosopo/procaptcha-pow")).ProcaptchaPow;

// Mirrors the constant each inner widget declares for `window.procaptcha
// .execute()`. Listened to here only in manual start mode, where no inner
// widget exists yet to receive it.
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

type CheckboxEvent = MouseEvent | TouchEvent | KeyboardEvent;

const noopCheckboxHandler = async (_event: CheckboxEvent): Promise<void> => {};

const renderPlaceholder = (
	theme: string | undefined,
	mode: ModeType,
	errorMessage: string | undefined,
	isTranslationLoaded: boolean,
	translationFn: (key: string) => string,
	loading: boolean,
	onChange: (event: CheckboxEvent) => Promise<void> = noopCheckboxHandler,
) => {
	const checkboxTheme = "light" === theme ? lightTheme : darkTheme;

	if (mode === "invisible") {
		return null;
	}

	return (
		<Checkbox
			theme={checkboxTheme}
			onChange={onChange}
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
	// Coords carried over from an `onSessionInvalidated` event on the inner
	// widget. Consumed once by the next `renderForCaptchaType` — the resumed
	// widget mounts with `autoStart` + `startCoords` so the user doesn't have
	// to click the checkbox a second time and the checkbox click position is
	// preserved in the eventual solution salt.
	const pendingRetryCoordsRef = useRef<RetryCoords | null>(null);
	// One-shot outer guard so a persistently broken session doesn't loop.
	// After we've retried once, a second NO_SESSION_FOUND falls back to the
	// inner widget's own `frictionlessState.restart()` path.
	const sessionInvalidatedFiredRef = useRef(false);
	// Bumped on every mount so the replacement widget gets a fresh React
	// `key`. Without it a re-render for the same captcha type reconciles onto
	// the existing element, and the inner widget keeps the manager it built on
	// first mount — still closed over the sessionId we've just replaced.
	const mountCountRef = useRef(0);
	// Set when the next mount must open its challenge without waiting for a
	// checkbox click. Held in a ref rather than passed down through `start()`
	// because `providerRetry` re-invokes `start` with no arguments, which would
	// otherwise drop the flag on the first provider retry.
	const nextMountAutoStartRef = useRef(false);
	// `manual` start mode: the widget is inert until the site asks for it (a
	// `procaptcha:start` event, e.g. `window.procaptcha.start()`) or the end
	// user clicks the checkbox — whichever comes first. Nothing runs on page
	// load: no detector, no behavioural collectors, no provider traffic.
	const manualStart = config.startMode === StartModeEnum.manual;
	// One-shot guard for the manual triggers. Both the event and the click can
	// fire, in either order; only the first runs the frictionless flow.
	const manualStartedRef = useRef(false);
	// The placeholder checkbox is built before `start()` exists in this scope,
	// so its click handler is reached through a ref that is filled in below.
	const manualCheckboxHandlerRef = useRef(noopCheckboxHandler);

	useEffect(() => {
		if (!config.language) return;
		if (i18n) {
			if (i18n.language !== config.language) {
				void i18n.changeLanguage(config.language);
			}
			return;
		}
		// Direct-React consumers don't go through WidgetFactory, so pass the
		// language into loadI18next — first init boots with the right language
		// (skipping browser detection), and subsequent calls reconcile via
		// changeLanguage inside loadI18next.
		void loadI18next(false, config.language);
	}, [i18n, config.language]);

	const [componentToRender, setComponentToRender] = useState(
		renderPlaceholder(
			config.theme,
			config.mode,
			stateRef.current.errorMessage,
			i18n.isInitialized,
			i18n.t,
			// Auto mode is already fetching, so it shows the spinner. Manual mode
			// has nothing in flight: show the real checkbox, at its final size,
			// and let a click on it be the trigger.
			!manualStart,
			manualStart
				? (event: CheckboxEvent) => manualCheckboxHandlerRef.current(event)
				: undefined,
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
		autoStart = false,
		escalationCoords?: RetryCoords,
	) => {
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
				sessionInvalidatedFiredRef,
				pendingRetryCoordsRef,
			);
			if (!shouldRestart) return;
			resetState(0);
			void start();
		};

		// The user pressed reload on the challenge. The provider consumed this
		// session when it issued the challenge, so there is no way to ask it
		// for another one — mint a new session by re-running frictionless and
		// re-mount the widget with `autoStart`, which is what makes a new
		// challenge appear instead of the modal simply closing. Not one-shot:
		// the user may keep asking for a different challenge.
		const onReload = (x?: number, y?: number) => {
			pendingRetryCoordsRef.current = normaliseRetryCoords(x, y);
			nextMountAutoStartRef.current = true;
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
		const forcedAutoStart = nextMountAutoStartRef.current;
		nextMountAutoStartRef.current = false;
		const { autoStart: resumedAutoStart, startCoords: retryStartCoords } =
			consumeRetryMountProps(
				pendingRetryCoordsRef,
				autoStart || forcedAutoStart,
			);
		const startCoords = escalationCoords ?? retryStartCoords;
		mountCountRef.current += 1;
		const mountKey = mountCountRef.current;

		if (captchaType === CaptchaType.image) {
			const Procaptcha = await ProcaptchaLoader();
			setComponentToRender(
				<Procaptcha
					key={mountKey}
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
					autoStart={resumedAutoStart}
					startCoords={startCoords}
					onSessionInvalidated={onSessionInvalidated}
					onReload={onReload}
				/>,
			);
		} else if (captchaType === CaptchaType.puzzle) {
			const ProcaptchaPuzzle = await ProcaptchaPuzzleLoader();
			setComponentToRender(
				<ProcaptchaPuzzle
					key={mountKey}
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
					autoStart={resumedAutoStart}
					startCoords={startCoords}
					onSessionInvalidated={onSessionInvalidated}
				/>,
			);
		} else {
			const ProcaptchaPow = await ProcaptchaPowLoader();
			setComponentToRender(
				<ProcaptchaPow
					key={mountKey}
					config={config}
					callbacks={callbacks}
					frictionlessState={frictionlessState}
					i18n={i18n}
					onEscalate={onEscalate}
					autoStart={resumedAutoStart}
					startCoords={startCoords}
					onSessionInvalidated={onSessionInvalidated}
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
				// After the first attempt, tell detection this is a retry so it
				// re-selects a random provider from the list rather than re-using
				// the DNS-routed pronode that just failed.
				const result = await detectBot(configOutput, container, restart, {
					attempt: stateRef.current.attemptCount,
				});

				const guard = evaluateFrictionlessResult(result);
				if (guard.kind === "error") {
					stateRef.current = {
						...stateRef.current,
						loading: false,
						errorMessage: guard.message,
					};
					events.onError(new Error(guard.message));
					fallOverWithStyle(guard.message, guard.key);
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

	// Run the deferred frictionless flow. `autoStart` makes the widget the
	// provider picks open its challenge as soon as it mounts, so a user who
	// clicked the placeholder checkbox is not asked to click again; `coords`
	// is that click's position, carried through to the solution salt exactly
	// as the session-invalidated retry path does.
	const startManually = async (
		autoStart: boolean,
		coords?: RetryCoords,
	): Promise<void> => {
		if (manualStartedRef.current) return;
		manualStartedRef.current = true;
		pendingRetryCoordsRef.current = coords ?? null;
		nextMountAutoStartRef.current = autoStart;
		// Swap the live checkbox for the spinner for the duration of the
		// frictionless round-trip, matching what auto mode shows on load.
		setComponentToRender(
			renderPlaceholder(
				config.theme,
				config.mode,
				stateRef.current.errorMessage,
				i18n.isInitialized,
				i18n.t,
				true,
			),
		);
		await start();
	};

	manualCheckboxHandlerRef.current = async (event: CheckboxEvent) => {
		// Checkbox has already rejected untrusted events by the time this runs.
		let x = 0;
		let y = 0;
		const nativeEvent = event.nativeEvent;
		if ("clientX" in nativeEvent && "clientY" in nativeEvent) {
			x = nativeEvent.clientX;
			y = nativeEvent.clientY;
		}
		await startManually(true, normaliseRetryCoords(x, y) ?? undefined);
	};

	// Manual mode triggers. `procaptcha:start` runs the frictionless flow and
	// leaves the resulting widget waiting for a click, as auto mode would
	// have. `procaptcha:execute` (the invisible-mode API) has no inner widget
	// to land on yet, so it is honoured here by starting with `autoStart`.
	// `container` is the widget's own element; an event addressed to a
	// different widget's element is ignored. Direct-React consumers, who
	// mount without a container, receive every event.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional — `startManually` captures the mount-time `start()`, as the auto-mode effect below does; the listener is keyed on the two values that decide whether it exists at all.
	useEffect(() => {
		if (!manualStart) return;
		const onStartEvent = (event: Event) => {
			const detail = (event as CustomEvent<ProcaptchaStartEventDetail>).detail;
			if (detail?.element && container && !detail.element.contains(container)) {
				return;
			}
			void startManually(false);
		};
		const onExecuteEvent = () => {
			void startManually(true);
		};
		document.addEventListener(PROCAPTCHA_START_EVENT, onStartEvent);
		document.addEventListener(PROCAPTCHA_EXECUTE_EVENT, onExecuteEvent);
		return () => {
			document.removeEventListener(PROCAPTCHA_START_EVENT, onStartEvent);
			document.removeEventListener(PROCAPTCHA_EXECUTE_EVENT, onExecuteEvent);
		};
	}, [manualStart, container]);

	// Track which config identity has already been started for. Host
	// pages often recreate the `callbacks` object (and sometimes the whole
	// `config`) on every render, which — before this guard — re-fired
	// the outer effect on every parent re-render and triggered a fresh
	// `/frictionless` call each time. On the 2026-07-01 iPhone WKWebView
	// incident we saw three frictionless calls fan out in 3 ms for the
	// same user and site key, each carrying its own sessionId, producing
	// "No session found" cascades and eventually an image-escalation
	// storm.
	//
	// Dep list is now the primitive identity of the widget (site key +
	// language + mode); the per-identity ref guard makes React StrictMode
	// double-invocation and same-identity re-renders idempotent.
	// `callbacks` and `detectBot` intentionally do NOT participate —
	// they're read via the closure captured by `start()` at call time,
	// so the latest values are still visible without triggering effect
	// re-runs.
	const startedForKeyRef = useRef<string | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional — see comment above.
	useEffect(() => {
		const key = `${config.account?.address ?? ""}|${config.language ?? ""}|${
			config.mode ?? ""
		}`;
		if (startedForKeyRef.current === key) return;
		startedForKeyRef.current = key;
		// Manual mode waits for one of the triggers above instead.
		if (manualStart) return;
		void start();
	}, [config.account?.address, config.language, config.mode]);

	return (
		<>
			<TestModeBanner siteKey={config.account?.address ?? ""} />
			{componentToRender}
		</>
	);
};
