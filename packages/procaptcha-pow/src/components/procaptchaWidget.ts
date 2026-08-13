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
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { Manager } from "../services/Manager.js";

// Define the same event name as in the bundle for consistency
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

export interface ProcaptchaPowHandle {
	destroy(): void;
}

export const mountProcaptchaPowWidget = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaPowHandle => {
	const teardown = new Teardown();
	const config = props.config;
	const i18n = props.i18n;
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const callbacks = props.callbacks || {};
	const translator = createTranslator(i18n);
	const isInvisible = ModeEnum.invisible === config.mode;

	const store: ProcaptchaStateHandle = createProcaptchaState();
	let loading = false;
	let lastError: ProcaptchaState["error"] = store.state.error;
	// Coordinates of the last `manager.start(x, y)` invocation from this widget
	// instance — either the checkbox click, or a `startCoords` handoff from a
	// prior `onSessionInvalidated` cycle.
	let lastCoords: { x: number; y: number } | null = null;
	// One-shot guard: a widget instance only escalates a single NO_SESSION_FOUND
	// to `onSessionInvalidated`. If the retry also fails, we fall through to
	// the pre-existing `frictionlessState.restart()` path instead of looping.
	let sessionInvalidatedFired = false;

	let honeypot: HoneypotComponent | undefined;
	let checkbox: Component<CheckboxProps> | undefined;

	// get the state update mechanism
	const updateState = buildUpdateState(store.state, store.update);

	const manager = Manager(
		config,
		store.state,
		updateState,
		callbacks,
		frictionlessState,
		props.onEscalate,
		() => honeypot?.getValue(),
	);

	const root = createElement("div");
	container.appendChild(root);

	if (frictionlessState?.hp) {
		// Invisible mode renders no checkbox, but we still render the honeypot
		// so bots that scan the DOM for inputs find a tempting target.
		honeypot = mountHoneypot(root, { encodedQuestion: frictionlessState.hp });
	}

	const runErrorEffect = () => {
		if (store.state.error === lastError) {
			return;
		}
		lastError = store.state.error;
		if (!store.state.error) {
			return;
		}
		loading = false;
		if ("CAPTCHA.NO_SESSION_FOUND" !== store.state.error.key) {
			return;
		}
		if (props.onSessionInvalidated && !sessionInvalidatedFired) {
			// Preserve the checkbox coords across the retry so the resumed
			// submit still carries the real entry-point telemetry. The
			// frictionless wrapper mints a fresh session and re-mounts this
			// widget with matching `autoStart` + `startCoords`.
			sessionInvalidatedFired = true;
			props.onSessionInvalidated(lastCoords?.x, lastCoords?.y);
			return;
		}
		if (frictionlessState) {
			// Fallback for widgets not mounted under a recovery-aware parent,
			// or a second NO_SESSION_FOUND after we've already retried once.
			const timer = setTimeout(() => {
				frictionlessState.restart();
			}, 100);
			teardown.add(() => clearTimeout(timer));
		}
	};

	const render = () => {
		runErrorEffect();
		checkbox?.update(checkboxProps());
	};

	const scheduler = createRenderScheduler(render);

	const checkboxProps = (): CheckboxProps => ({
		checked: store.state.isHuman,
		theme: "light" === config.theme ? lightTheme : darkTheme,
		labelText: translator.isReady() ? translator.t("WIDGET.I_AM_HUMAN") : "",
		error: store.state.error?.message,
		loading,
		onChange: async (
			event: MouseEvent | KeyboardEvent | TouchEvent,
		): Promise<void> => {
			if (loading) {
				return;
			}
			loading = true;
			scheduler.schedule();

			// Capture click coordinates. Untrusted events are left at (0, 0) so a
			// synthesised click can't seed the solution salt.
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
			try {
				await manager.start(x, y);
			} catch (error) {
				// Nothing awaits this handler, so a rejection here would surface as
				// an unhandled rejection and the spinner would never clear.
				console.error("Error starting PoW verification:", error);
			}
			loading = false;
			scheduler.schedule();
		},
	});

	if (!isInvisible) {
		checkbox = mountCheckbox(root, checkboxProps());
	}

	teardown.add(scheduler.cancel);
	teardown.add(store.subscribe(scheduler.schedule));
	teardown.add(translator.subscribe(scheduler.schedule));

	// Only set up the execute listener in invisible mode: it starts verification
	// directly, without showing any UI.
	if (isInvisible) {
		teardown.addEventListener(document, PROCAPTCHA_EXECUTE_EVENT, () => {
			try {
				void manager.start().catch((error: unknown) => {
					console.error("Error starting PoW verification:", error);
				});
			} catch (error) {
				console.error("Error starting PoW verification:", error);
			}
		});
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
		const coords = props.startCoords;
		lastCoords = coords ?? null;
		scheduler.schedule();
		manager
			.start(coords?.x ?? 0, coords?.y ?? 0)
			// The manager handles its own failures, but anything it doesn't (a
			// reset that throws, say) would otherwise escape as an unhandled
			// rejection and leave the widget stuck showing a spinner.
			.catch((error: unknown) => {
				console.error("Error starting PoW verification:", error);
			})
			.finally(() => {
				loading = false;
				scheduler.schedule();
			});
	}

	render();

	return {
		destroy: () => {
			teardown.run();
			checkbox?.destroy();
			honeypot?.destroy();
			root.parentNode?.removeChild(root);
		},
	};
};

export default mountProcaptchaPowWidget;
