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
	ModeEnum,
	type ModeType,
	PROCAPTCHA_START_EVENT,
	ProcaptchaConfigSchema,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
	type ProcaptchaStartEventDetail,
	StartModeEnum,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { mountAuthenticatedBadge } from "./authenticatedBadge.js";
import customDetectBot from "./customDetectBot.js";
import { evaluateFrictionlessResult } from "./frictionlessResultGuard.js";
import {
	type MutableRef,
	type RetryCoords,
	consumeRetryMountProps,
	handleSessionInvalidated,
	normaliseRetryCoords,
} from "./sessionInvalidatedRecovery.js";

const NO_SESSION_FOUND_KEY = "CAPTCHA.NO_SESSION_FOUND";

const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

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
	attemptCount,
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
	// Bounded outer guard so a persistently broken session doesn't loop. Each
	// re-mint costs a /frictionless round trip, so the count is capped — but
	// it is a count rather than a one-shot, because a widget legitimately
	// mints a new session every time the user presses reload. `onReload`
	// clears it for the same reason. When the budget is spent we fall over
	// visibly (see `onSessionInvalidated`) instead of leaving the user on a
	// dead "No session found" checkbox.
	const sessionInvalidatedAttempts: MutableRef<number> = { current: 0 };
	// Escalation sessions we have already mounted a widget for. The provider
	// mints exactly one escalation session per PoW solution and consumes it on
	// the first challenge fetch, so a repeat handoff for the same id can only
	// produce a widget that 400s with NO_SESSION_FOUND. The PoW manager fires
	// `onEscalate` from inside its `providerRetry`-wrapped `submit()`, so a
	// throw anywhere after the handoff re-runs submit and escalates a second
	// time on the same envelope.
	const escalatedSessionIds = new Set<string>();
	// Set when the next mount must open its challenge without waiting for a
	// checkbox click. Held here rather than passed through `start()` because
	// `providerRetry` re-invokes `start` with no arguments, which would
	// otherwise drop the flag on the first provider retry.
	let nextMountAutoStart = false;
	const manualStart = StartModeEnum.manual === config.startMode;
	let manualStarted = false;
	// The inner widget only listens for `procaptcha:execute` once /frictionless
	// has answered, its chunk has loaded and it has mounted. An execute() in
	// that window (e.g. a fast form submit) would otherwise be dropped and the
	// challenge never open, so it is held here and replayed on mount.
	let pendingExecute = false;
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
		onChange?: CheckboxProps["onChange"],
	) => {
		clearSlot();

		if ("invisible" === mode) {
			return;
		}

		placeholder = mountCheckbox(slot, {
			theme: "light" === config.theme ? lightTheme : darkTheme,
			// Inert unless the site asked for a manual start: this checkbox
			// stands in until detection picks a solver, and clicking it must
			// not start anything of its own.
			onChange: onChange ?? (() => undefined),
			checked: false,
			labelText: i18n.isInitialized ? i18n.t("WIDGET.I_AM_HUMAN") : "",
			error: errorMessage,
			loadingText: i18n.isInitialized ? i18n.t("WIDGET.CHECKING") : undefined,
			loading,
		});
	};

	// `??`, not `||`: every caller that wants the counter back at zero passes
	// literal 0, and `0 || current` silently kept the old count. `start()` then
	// tripped its own `attemptCount >= 5` fall-over after five *cumulative*
	// runs in a widget lifetime — five reload presses were enough to strand the
	// user on the error placeholder even though every one of them succeeded.
	const resetState = (attemptCount?: number) => {
		state = defaultLoadingState(attemptCount ?? state.attemptCount);
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

	// The inner widget is now listening, so an execute() that arrived while
	// /frictionless was still in flight can be delivered. It goes to the
	// container, not document, so other widgets on the page don't run twice.
	const replayPendingExecute = () => {
		if (!pendingExecute) {
			return;
		}
		pendingExecute = false;
		(widgetContainer ?? document).dispatchEvent(
			new CustomEvent(PROCAPTCHA_EXECUTE_EVENT),
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
			// Idempotent per escalation session — see `escalatedSessionIds`.
			// Without this a re-run of the PoW widget's `submit()` mounts a
			// second widget against the session the first one already spent,
			// which the provider answers with 400 CAPTCHA.NO_SESSION_FOUND.
			if (escalatedSessionIds.has(newSessionId)) return;
			escalatedSessionIds.add(newSessionId);
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
		// (a duplicate /captcha/{type} POST consumed it first, or the widget
		// re-sent an id it had already spent). Re-run the frictionless flow to
		// mint a fresh session, then re-mount the inner widget with the
		// preserved checkbox click coords so the user is not asked to click a
		// second time.
		//
		// The inner widget cannot recover on its own here: it always takes
		// this branch and returns before its own `frictionlessState.restart()`
		// fallback, and it is rebuilt from scratch on every re-mount. So
		// whatever this handler declines to do, nothing else does — hence the
		// terminal `fallOverWithStyle` rather than a silent return once the
		// retry budget is spent.
		const onSessionInvalidated = (x?: number, y?: number) => {
			const { shouldRestart } = handleSessionInvalidated(
				x,
				y,
				sessionInvalidatedAttempts,
				pendingRetryCoords,
			);
			if (shouldRestart) {
				resetState(0);
				void start();
				return;
			}
			// Budget spent. Surface the error on the checkbox and let
			// `fallOverWithStyle`'s NO_SESSION_FOUND branch schedule the
			// 10-second full restart, so the user always has a way back.
			const message = i18n.isInitialized
				? i18n.t(NO_SESSION_FOUND_KEY)
				: "No session found";
			events.onError(new Error(message));
			fallOverWithStyle(message, NO_SESSION_FOUND_KEY);
		};

		// The user pressed reload on the challenge. The provider consumed this
		// session when it issued the challenge, so there is no way to ask it
		// for another one — mint a new session by re-running frictionless and
		// re-mount the widget with `autoStart`, which is what makes a new
		// challenge appear instead of the modal simply closing. Not one-shot:
		// the user may keep asking for a different challenge.
		const onReload = (x?: number, y?: number) => {
			pendingRetryCoords.current = normaliseRetryCoords(x, y);
			nextMountAutoStart = true;
			// A reload mints a genuinely new session, so the invalidation
			// budget for the *previous* one shouldn't count against it.
			sessionInvalidatedAttempts.current = 0;
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
		const forcedAutoStart = nextMountAutoStart;
		nextMountAutoStart = false;
		const { autoStart: resumedAutoStart, startCoords: retryStartCoords } =
			consumeRetryMountProps(pendingRetryCoords, autoStart || forcedAutoStart);
		const startCoords = escalationCoords ?? retryStartCoords;

		const widgetProps: ProcaptchaProps = {
			config,
			callbacks,
			frictionlessState,
			i18n,
			autoStart: resumedAutoStart,
			startCoords,
			onSessionInvalidated,
			container: widgetContainer,
		};

		if (CaptchaType.authenticated === captchaType) {
			// Web Bot Auth pre-verified pass-through. No challenge, no
			// interaction — the badge encodes and fires the token on mount.
			// Skip the loader chain the other branches use because there is no
			// captcha module to lazy-import here.
			if (!frictionlessState.sessionId) {
				events.onError(
					new Error(
						"authenticated captcha response missing sessionId — provider is misbehaving",
					),
				);
				fallOverWithStyle();
				return;
			}
			clearSlot();
			solver = mountAuthenticatedBadge(slot, {
				sessionId: frictionlessState.sessionId,
				agent: frictionlessState.agent,
				dapp: config.account.address ?? "",
				userAccount: frictionlessState.userAccount,
				provider: frictionlessState.provider,
				callbacks,
			});
			return;
		}

		if (CaptchaType.image === captchaType) {
			const mount = await ProcaptchaLoader();
			if (destroyed) return;
			clearSlot();
			solver = mount(slot, { ...widgetProps, onReload });
			replayPendingExecute();
			return;
		}

		if (CaptchaType.puzzle === captchaType) {
			const mount = await ProcaptchaPuzzleLoader();
			if (destroyed) return;
			clearSlot();
			solver = mount(slot, widgetProps);
			replayPendingExecute();
			return;
		}

		const mount = await ProcaptchaPowLoader();
		if (destroyed) return;
		clearSlot();
		solver = mount(slot, { ...widgetProps, onEscalate });
		replayPendingExecute();
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

				const guard = evaluateFrictionlessResult(result);
				if ("error" === guard.kind) {
					// Throwing hands this to providerRetry, which re-rolls onto a
					// different provider. The client does not throw on a 400 with a
					// JSON body, so without this an unrecognised provider-side
					// failure stranded the user on the first response even when
					// every other node was healthy.
					if (guard.retryable) {
						throw new Error(guard.message);
					}
					state = {
						...state,
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
					agent: result.agent,
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
				// Retries swallow the underlying error, so without this a site's
				// error callback never fires for a failure that retried — it would
				// have fired immediately before retrying was introduced.
				events.onError(new Error("Cannot load CAPTCHA"));
				fallOverWithStyle();
				restartComponentTimeout();
			}
		});
	};

	/**
	 * `startMode: "manual"` defers the whole frictionless flow until the site
	 * (or the user, via the placeholder checkbox) asks for it. One-shot: the
	 * flow runs at most once per widget lifetime, however many triggers fire.
	 */
	const startManually = async (
		autoStart: boolean,
		coords?: RetryCoords,
	): Promise<void> => {
		if (manualStarted) return;
		manualStarted = true;
		pendingRetryCoords.current = coords ?? null;
		nextMountAutoStart = autoStart;
		renderPlaceholder(config.mode, state.errorMessage, true);
		await start();
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

	const manualCheckboxHandler: CheckboxProps["onChange"] = async (
		event: MouseEvent | KeyboardEvent | TouchEvent,
	): Promise<void> => {
		let x = 0;
		let y = 0;
		if ("clientX" in event && "clientY" in event) {
			x = event.clientX;
			y = event.clientY;
		}
		await startManually(true, normaliseRetryCoords(x, y) ?? undefined);
	};

	// Initial paint: the loading placeholder, before detection resolves. Under
	// manual start there is nothing in flight yet, so the box is idle and
	// clickable rather than spinning.
	renderPlaceholder(
		config.mode,
		state.errorMessage,
		!manualStart,
		manualStart ? manualCheckboxHandler : undefined,
	);

	if (manualStart) {
		teardown.addEventListener(document, PROCAPTCHA_START_EVENT, (event) => {
			const detail = (event as CustomEvent<ProcaptchaStartEventDetail>).detail;
			if (
				detail?.element &&
				widgetContainer &&
				!detail.element.contains(widgetContainer)
			) {
				return;
			}
			void startManually(false);
		});
		teardown.addEventListener(document, PROCAPTCHA_EXECUTE_EVENT, () => {
			void startManually(true);
		});
	} else {
		// Mirrors the inner widgets' own listeners: a targeted execute() arrives
		// on the container in either mode, a bare one on document in invisible
		// mode. Either is held until a widget exists to receive it.
		const holdExecute = () => {
			if (!solver) pendingExecute = true;
		};
		if (widgetContainer) {
			teardown.addEventListener(
				widgetContainer,
				PROCAPTCHA_EXECUTE_EVENT,
				holdExecute,
			);
		}
		if (ModeEnum.invisible === config.mode) {
			teardown.addEventListener(
				document,
				PROCAPTCHA_EXECUTE_EVENT,
				holdExecute,
			);
		}

		// One mount, one frictionless call. The React version needed a
		// started-for-identity ref here because a host page recreating
		// `callbacks` (or the whole `config`) on every render re-fired the
		// effect; there is no re-render to guard against now, so mounting is
		// the trigger.
		void start();
	}

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
