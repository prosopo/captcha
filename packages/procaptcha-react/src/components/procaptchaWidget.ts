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
import { Manager } from "@prosopo/procaptcha";
import {
	type CheckboxProps,
	type Component,
	type HoneypotComponent,
	type ProcaptchaStateHandle,
	Teardown,
	createElement,
	createProcaptchaState,
	createRenderScheduler,
	isEventTrusted,
	mountCheckbox,
	mountHoneypot,
	mountTestModeBanner,
} from "@prosopo/procaptcha-common";
import {
	ProcaptchaConfigSchema,
	type ProcaptchaProps,
	type ProcaptchaState,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import {
	type CaptchaComponentProps,
	mountCaptchaComponent,
} from "./captchaComponent.js";
import { mountModal } from "./modal.js";

// Define the same event name as in the bundle
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

export interface ProcaptchaWidgetHandle {
	destroy(): void;
}

export const mountProcaptchaImageWidget = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaWidgetHandle => {
	const teardown = new Teardown();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState; // Set up Session ID and Provider if they exist
	const i18n = props.i18n;
	const callbacks = props.callbacks || {};
	const translator = createTranslator(i18n);
	const isInvisible = "invisible" === config.mode;

	const store: ProcaptchaStateHandle = createProcaptchaState();
	let loading = false;
	// The error this widget has already reacted to, standing in for the effect
	// dependency list that used to gate the recovery path.
	let lastError: ProcaptchaState["error"] = store.state.error;
	// Coords of the last `manager.start(x, y)` from this widget instance, held
	// so the session-invalidation path can replay them on the re-mint. See
	// procaptcha-pow's widget — same contract.
	let lastCoords: { x: number; y: number } | null = null;
	// One-shot per widget lifetime: a persistently broken session must not loop.
	let sessionInvalidatedFired = false;

	let honeypot: HoneypotComponent | undefined;
	let captcha: Component<CaptchaComponentProps> | undefined;
	let checkbox: Component<CheckboxProps> | undefined;

	const manager = Manager(
		config,
		store.state,
		store.update,
		callbacks,
		frictionlessState,
		() => honeypot?.getValue(),
	);

	const root = createElement("div", {
		className: isInvisible ? undefined : "image-captcha",
	});
	container.appendChild(root);

	if (frictionlessState?.hp) {
		honeypot = mountHoneypot(root, { encodedQuestion: frictionlessState.hp });
	}

	const modal = mountModal({ show: store.state.showModal });
	const emptyChallenge = createElement("div", { text: "No challenge set." });

	const banner = isInvisible
		? undefined
		: mountTestModeBanner(root, { siteKey: config.account.address ?? "" });

	const captchaProps = (
		challenge: NonNullable<ProcaptchaState["challenge"]>,
	): CaptchaComponentProps => ({
		challenge,
		index: store.state.index,
		solutions: store.state.solutions,
		onSubmit: manager.submit,
		onCancel: manager.cancel,
		onClick: manager.select,
		onNext: manager.nextRound,
		onReload: manager.reload,
		themeColor: config.theme ?? "light",
		translator,
	});

	const renderModal = () => {
		modal.update({ show: store.state.showModal });

		const challenge = store.state.challenge;
		if (undefined !== challenge) {
			emptyChallenge.parentNode?.removeChild(emptyChallenge);
			if (undefined === captcha) {
				captcha = mountCaptchaComponent(modal.content, captchaProps(challenge));
			} else {
				captcha.update(captchaProps(challenge));
			}
			return;
		}

		captcha?.destroy();
		captcha = undefined;
		// Invisible mode rendered nothing at all in place of the challenge.
		if (!isInvisible && emptyChallenge.parentNode !== modal.content) {
			modal.content.appendChild(emptyChallenge);
		}
	};

	// Fires on a state.error transition, mirroring the effect that was keyed on
	// `[state.error, frictionlessState, props.onSessionInvalidated]`.
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
		renderModal();
		checkbox?.update(checkboxProps());
	};

	const scheduler = createRenderScheduler(render);

	const checkboxProps = (): CheckboxProps => ({
		theme: "light" === props.config.theme ? lightTheme : darkTheme,
		checked: store.state.isHuman,
		labelText: translator.isReady() ? translator.t("WIDGET.I_AM_HUMAN") : "",
		error: store.state.error?.message,
		loading,
		onChange: async (
			event: MouseEvent | KeyboardEvent | TouchEvent,
		): Promise<void> => {
			if (!isEventTrusted(event)) {
				return;
			}
			if (loading) {
				return;
			}
			loading = true;
			scheduler.schedule();

			let x = 0;
			let y = 0;
			// The checkbox only calls this from a click or from Enter — a tap
			// arrives as a click and carries clientX/clientY like any other.
			// Only the keyboard path has no coordinates.
			if ("clientX" in event && "clientY" in event) {
				x = event.clientX;
				y = event.clientY;
			}

			lastCoords = { x, y };
			try {
				await manager.start(x, y);
			} catch (error) {
				// The manager reports failures to the user through state.error;
				// rethrowing here only produces an unhandled rejection, since
				// nothing awaits this handler.
				console.error("Error starting verification:", error);
			} finally {
				// A rejected start would otherwise leave the spinner up for good,
				// with no way back to the checkbox for the user.
				loading = false;
				scheduler.schedule();
			}
		},
	});

	if (!isInvisible) {
		checkbox = mountCheckbox(root, checkboxProps());
	}

	teardown.add(scheduler.cancel);
	teardown.add(store.subscribe(scheduler.schedule));
	teardown.add(translator.subscribe(scheduler.schedule));

	// Add event listener for the execute event
	teardown.addEventListener(document, PROCAPTCHA_EXECUTE_EVENT, () => {
		// Show the modal
		store.update({ showModal: true });

		// If we need to load a challenge or do other initialization
		if (!store.state.challenge) {
			console.log("No challenge set, attempting to start verification");
			try {
				void manager.start();
			} catch (error) {
				console.error("Error starting verification:", error);
			}
		}
	});

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
		const clearLoading = () => {
			loading = false;
			scheduler.schedule();
		};
		manager
			.start(coords?.x ?? 0, coords?.y ?? 0)
			.then(clearLoading, clearLoading);
	}

	render();

	return {
		destroy: () => {
			teardown.run();
			captcha?.destroy();
			modal.destroy();
			checkbox?.destroy();
			banner?.destroy();
			honeypot?.destroy();
			root.parentNode?.removeChild(root);
		},
	};
};

export default mountProcaptchaImageWidget;
