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

import { createTranslator, loadI18next } from "@prosopo/locale";
import {
	type CheckboxProps,
	type Component,
	type HoneypotComponent,
	type ProcaptchaStateHandle,
	Teardown,
	buildUpdateState,
	createElement,
	createProcaptchaState,
	createRenderScheduler,
	isEventTrusted,
	mountCheckbox,
	mountHoneypot,
} from "@prosopo/procaptcha-common";
import {
	type GetPuzzleCaptchaResponse,
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
	type PuzzleEvent,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { Manager } from "../services/Manager.js";
import { type PuzzleCanvasProps, mountPuzzleCanvas } from "./puzzleCanvas.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

type PuzzlePhase = "checkbox" | "dragging" | "submitting";

export interface ProcaptchaPuzzleHandle {
	destroy(): void;
}

export const mountProcaptchaPuzzleWidget = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaPuzzleHandle => {
	const teardown = new Teardown();
	const config = props.config;
	const i18n = props.i18n;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const translator = createTranslator(i18n);
	const isInvisible = ModeEnum.invisible === config.mode;

	const store: ProcaptchaStateHandle = createProcaptchaState();
	let loading = false;
	let puzzlePhase: PuzzlePhase = "checkbox";
	let challengeData: GetPuzzleCaptchaResponse | null = null;
	// A re-mint after a wrong answer builds a brand new widget, so the miss is
	// only still on screen if the wrapper hands it back to us.
	let showRetry = true === props.startShowRetry;
	let lastError: ProcaptchaState["error"] = store.state.error;
	// See procaptcha-pow's widget — same session-invalidation recovery contract
	// with coords preservation across a re-mint.
	let lastCoords: { x: number; y: number } | null = null;
	let sessionInvalidatedFired = false;
	// Dismissing the puzzle doesn't cancel the request behind it, so each user
	// action takes a fresh attempt and a result that lands after a newer one
	// began is dropped rather than reopening or overwriting the puzzle.
	let attempt = 0;

	let honeypot: HoneypotComponent | undefined;
	let checkbox: Component<CheckboxProps> | undefined;
	let puzzle: Component<PuzzleCanvasProps> | undefined;

	// get the state update mechanism
	const updateState = buildUpdateState(store.state, store.update);

	const manager = Manager(
		config,
		store.state,
		updateState,
		callbacks,
		frictionlessState,
		() => honeypot?.getValue(),
	);

	const root = createElement("div");
	container.appendChild(root);

	if (frictionlessState?.hp) {
		honeypot = mountHoneypot(root, { encodedQuestion: frictionlessState.hp });
	}

	const handlePuzzleComplete = async (
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
	): Promise<void> => {
		const mine = ++attempt;
		puzzlePhase = "submitting";
		scheduler.schedule();

		let verified = false;
		try {
			verified = await manager.submitSolution(finalX, finalY, puzzleEvents);
		} catch (error) {
			callbacks.onError?.(
				error instanceof Error ? error : new Error(String(error)),
			);
		}
		if (mine !== attempt) {
			return;
		}

		if (verified) {
			puzzlePhase = "checkbox";
			challengeData = null;
			showRetry = false;
			loading = false;
			scheduler.schedule();
			return;
		}

		// Failed — show retry message and fetch a new challenge
		showRetry = true;
		puzzlePhase = "dragging";
		scheduler.schedule();

		// A frictionless session is single-use: the provider consumed it when it
		// issued the puzzle the user just got wrong, so asking `manager.start()`
		// for a replacement on the same sessionId can only ever come back
		// CAPTCHA.NO_SESSION_FOUND — a wasted round trip that surfaces an error
		// on the checkbox before the wrapper recovers. Go straight to the
		// re-mint instead; the wrapper mints a new session and re-mounts us with
		// `autoStart`, so a fresh puzzle appears in place.
		if (frictionlessState?.sessionId && props.onReload) {
			puzzlePhase = "submitting";
			scheduler.schedule();
			props.onReload(lastCoords?.x, lastCoords?.y, { showRetry: true });
			return;
		}

		try {
			const newChallenge = await manager.start();
			if (mine !== attempt) {
				return;
			}
			if (newChallenge) {
				challengeData = newChallenge;
			} else {
				// Couldn't get new challenge, fall back to checkbox
				puzzlePhase = "checkbox";
				challengeData = null;
				showRetry = false;
			}
		} catch {
			if (mine !== attempt) {
				return;
			}
			puzzlePhase = "checkbox";
			challengeData = null;
			showRetry = false;
		}
		loading = false;
		scheduler.schedule();
	};

	// Dismissing returns to the checkbox; clicking away is not a wrong answer.
	const handleDismiss = () => {
		attempt++;
		puzzlePhase = "checkbox";
		challengeData = null;
		showRetry = false;
		loading = false;
		scheduler.schedule();
	};

	const puzzleProps = (
		challenge: GetPuzzleCaptchaResponse,
	): PuzzleCanvasProps => ({
		originX: challenge.originX,
		originY: challenge.originY,
		background: challenge.background,
		piece: challenge.piece,
		pieceSize: challenge.pieceSize,
		onComplete: (finalX: number, finalY: number, events: PuzzleEvent[]) => {
			void handlePuzzleComplete(finalX, finalY, events);
		},
		showRetry,
		submitting: "submitting" === puzzlePhase,
		theme: "light" === config.theme ? lightTheme : darkTheme,
		translator,
		placement: config.placement,
		anchor: props.container,
		onDismiss: handleDismiss,
	});

	const runErrorEffect = () => {
		if (store.state.error === lastError) {
			return;
		}
		lastError = store.state.error;
		if (!store.state.error) {
			return;
		}
		loading = false;
		puzzlePhase = "checkbox";
		challengeData = null;
		showRetry = false;
		if ("CAPTCHA.NO_SESSION_FOUND" !== store.state.error.key) {
			return;
		}
		// Suppressed only when something is actually going to re-mint: this is
		// an internal recovery signal, not something the user should read, so
		// hold the spinner rather than paint a support code that is about to
		// stop being true. Clearing it re-enters this effect once, which returns
		// at the `!error` guard. With no recovery route the error stands — a
		// spinner that never resolves is worse than a message.
		const willRecover =
			(props.onSessionInvalidated && !sessionInvalidatedFired) ||
			undefined !== frictionlessState;
		if (willRecover) {
			loading = true;
			store.update({ error: undefined });
		}
		if (props.onSessionInvalidated && !sessionInvalidatedFired) {
			sessionInvalidatedFired = true;
			props.onSessionInvalidated(lastCoords?.x, lastCoords?.y);
			return;
		}
		if (frictionlessState) {
			const timer = setTimeout(() => {
				frictionlessState.restart();
			}, 100);
			teardown.add(() => clearTimeout(timer));
		}
	};

	const render = () => {
		runErrorEffect();

		// Puzzle overlay — shown in both visible and invisible modes once a
		// challenge has been fetched; puzzle is inherently interactive.
		const showOverlay =
			("dragging" === puzzlePhase || "submitting" === puzzlePhase) &&
			null !== challengeData;

		if (showOverlay && null !== challengeData) {
			if (undefined === puzzle) {
				puzzle = mountPuzzleCanvas(puzzleProps(challengeData));
			} else {
				puzzle.update(puzzleProps(challengeData));
			}
		} else {
			puzzle?.destroy();
			puzzle = undefined;
		}

		checkbox?.update(checkboxProps());
	};

	const scheduler = createRenderScheduler(render);

	const checkboxProps = (): CheckboxProps => ({
		checked: store.state.isHuman,
		theme: "light" === config.theme ? lightTheme : darkTheme,
		labelText: translator.isReady() ? translator.t("WIDGET.I_AM_HUMAN") : "",
		error: store.state.error?.message,
		loadingText: translator.t("WIDGET.CHECKING", {
			defaultValue: "Checking that you are human",
		}),
		loading: loading || "submitting" === puzzlePhase,
		onChange: async (
			event: MouseEvent | KeyboardEvent | TouchEvent,
		): Promise<void> => {
			if (loading) {
				return;
			}
			loading = true;
			showRetry = false;
			scheduler.schedule();

			// Capture click coordinates (mirrors the PoW widget) so the puzzle
			// solution salt records the entry-point telemetry.
			let x = 0;
			let y = 0;
			if (!isEventTrusted(event)) {
				// Don't capture coordinates for non-trusted events
			} else if ("touches" in event && event.touches.length > 0) {
				const touch = event.touches[0];
				if (touch) {
					x = touch.clientX;
					y = touch.clientY;
				}
			} else if ("clientX" in event && "clientY" in event) {
				x = event.clientX;
				y = event.clientY;
			}

			lastCoords = { x, y };
			const mine = ++attempt;
			try {
				const challenge = await manager.start(x, y);
				if (mine !== attempt) {
					return;
				}
				if (challenge) {
					challengeData = challenge;
					puzzlePhase = "dragging";
				}
			} catch (error) {
				// The manager reports failures through state.error; rethrowing here
				// only produces an unhandled rejection, since nothing awaits this
				// handler.
				callbacks.onError?.(
					error instanceof Error ? error : new Error(String(error)),
				);
			} finally {
				// A rejected start would otherwise leave the spinner up for good,
				// with no way back to the checkbox for the user.
				if (mine === attempt) {
					loading = false;
					scheduler.schedule();
				}
			}
		},
	});

	// Checkbox — only in visible mode. Invisible mode is driven by the host
	// page's execute() call (e.g. on form submit).
	if (!isInvisible) {
		checkbox = mountCheckbox(root, checkboxProps());
	}

	teardown.add(scheduler.cancel);
	teardown.add(store.subscribe(scheduler.schedule));
	teardown.add(translator.subscribe(scheduler.schedule));

	// A bare execute() reaches every invisible widget via document. A targeted
	// execute() is dispatched on this widget's container and works in either
	// mode, which is what lets a bound button drive a visible widget. Either
	// way it fetches a challenge and drives the puzzle UI through the same
	// phase transitions as the visible checkbox flow.
	const handleExecute = () => {
		void (async () => {
			if (loading) {
				return;
			}
			loading = true;
			showRetry = false;
			scheduler.schedule();
			const mine = ++attempt;
			try {
				const challenge = await manager.start();
				if (mine !== attempt) {
					return;
				}
				if (challenge) {
					challengeData = challenge;
					puzzlePhase = "dragging";
				}
			} catch (error) {
				callbacks.onError?.(
					error instanceof Error ? error : new Error(String(error)),
				);
			} finally {
				if (mine === attempt) {
					loading = false;
					scheduler.schedule();
				}
			}
		})();
	};

	if (props.container) {
		teardown.addEventListener(
			props.container,
			PROCAPTCHA_EXECUTE_EVENT,
			handleExecute,
		);
	}
	if (isInvisible) {
		teardown.addEventListener(
			document,
			PROCAPTCHA_EXECUTE_EVENT,
			handleExecute,
		);
	}

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

	if (props.autoStart) {
		loading = true;
		// Deliberately not cleared: an autoStart mount is how a re-mint after a
		// wrong answer arrives, and `startShowRetry` says whether it was one.
		const coords = props.startCoords;
		lastCoords = coords ?? null;
		scheduler.schedule();
		manager.start(coords?.x ?? 0, coords?.y ?? 0).then(
			(challenge: GetPuzzleCaptchaResponse | undefined) => {
				if (challenge) {
					challengeData = challenge;
					puzzlePhase = "dragging";
				}
				loading = false;
				scheduler.schedule();
			},
			() => {
				loading = false;
				scheduler.schedule();
			},
		);
	}

	render();

	return {
		destroy: () => {
			teardown.run();
			puzzle?.destroy();
			checkbox?.destroy();
			honeypot?.destroy();
			root.parentNode?.removeChild(root);
		},
	};
};

export default mountProcaptchaPuzzleWidget;
