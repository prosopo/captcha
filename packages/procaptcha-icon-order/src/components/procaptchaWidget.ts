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

import {
	createTranslator,
	loadI18next,
	localiseErrorMessage,
} from "@prosopo/locale";
import {
	type CheckboxProps,
	type ClickCoords,
	type Component,
	type HoneypotComponent,
	PROCAPTCHA_EXECUTE_EVENT,
	type ProcaptchaStateHandle,
	Teardown,
	audioAlternativeOffer,
	buildUpdateState,
	createElement,
	createProcaptchaState,
	createRenderScheduler,
	mountCheckbox,
	mountHoneypot,
	trustedClickCoords,
} from "@prosopo/procaptcha-common";
import {
	type GetIconOrderCaptchaResponse,
	type IconClick,
	type IconOrderEvent,
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { Manager } from "../services/Manager.js";
import {
	type IconOrderCanvasProps,
	mountIconOrderCanvas,
} from "./iconOrderCanvas.js";

type IconOrderPhase = "checkbox" | "selecting" | "submitting";

export interface ProcaptchaIconOrderHandle {
	destroy(): void;
}

export const mountProcaptchaIconOrderWidget = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaIconOrderHandle => {
	const teardown = new Teardown();
	const config = props.config;
	const i18n = props.i18n;
	const frictionlessState = props.frictionlessState;
	const callbacks = props.callbacks || {};
	const translator = createTranslator(i18n);
	const isInvisible = ModeEnum.invisible === config.mode;
	const theme = "light" === config.theme ? lightTheme : darkTheme;

	const store: ProcaptchaStateHandle = createProcaptchaState();
	let loading = false;
	let iconOrderPhase: IconOrderPhase = "checkbox";
	let challengeData: GetIconOrderCaptchaResponse | null = null;
	// A re-mint after a wrong answer builds a brand new widget, so the miss is
	// only still on screen if the wrapper hands it back to us.
	let showRetry = true === props.startShowRetry;
	let lastError: ProcaptchaState["error"] = store.state.error;
	let lastCoords: ClickCoords | null = null;
	let sessionInvalidatedFired = false;

	let honeypot: HoneypotComponent | undefined;
	let checkbox: Component<CheckboxProps> | undefined;
	let canvas: Component<IconOrderCanvasProps> | undefined;

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

	const reportError = (error: unknown) => {
		callbacks.onError?.(
			error instanceof Error ? error : new Error(String(error)),
		);
	};

	const returnToCheckbox = () => {
		iconOrderPhase = "checkbox";
		challengeData = null;
		showRetry = false;
	};

	const showChallenge = (
		challenge: GetIconOrderCaptchaResponse | undefined,
	) => {
		if (challenge) {
			challengeData = challenge;
			iconOrderPhase = "selecting";
		}
	};

	const handleIconOrderComplete = async (
		clicks: IconClick[],
		iconOrderEvents: IconOrderEvent[],
	): Promise<void> => {
		iconOrderPhase = "submitting";
		scheduler.schedule();

		let verified = false;
		try {
			verified = await manager.submitSolution(clicks, iconOrderEvents);
		} catch (error) {
			reportError(error);
		}

		if (verified) {
			returnToCheckbox();
			loading = false;
			scheduler.schedule();
			return;
		}

		showRetry = true;
		iconOrderPhase = "selecting";
		scheduler.schedule();

		// The provider consumed the frictionless session when it issued this
		// challenge, so a replacement on the same sessionId can only come back
		// NO_SESSION_FOUND. Re-mint instead: the wrapper re-mounts us with
		// `autoStart` and a fresh challenge.
		if (frictionlessState?.sessionId && props.onReload) {
			iconOrderPhase = "submitting";
			scheduler.schedule();
			props.onReload(lastCoords?.x, lastCoords?.y, { showRetry: true });
			return;
		}

		try {
			const newChallenge = await manager.start();
			if (newChallenge) {
				challengeData = newChallenge;
			} else {
				returnToCheckbox();
			}
		} catch {
			returnToCheckbox();
		}
		loading = false;
		scheduler.schedule();
	};

	// Clicking away is not a wrong answer, so no retry prompt.
	const handleDismiss = () => {
		returnToCheckbox();
		loading = false;
		scheduler.schedule();
	};

	const canvasProps = (
		challenge: GetIconOrderCaptchaResponse,
	): IconOrderCanvasProps => ({
		background: challenge.background,
		legend: challenge.legend,
		legendIconSize: challenge.legendIconSize,
		onComplete: (clicks: IconClick[], events: IconOrderEvent[]) => {
			void handleIconOrderComplete(clicks, events);
		},
		showRetry,
		submitting: "submitting" === iconOrderPhase,
		theme,
		translator,
		placement: config.placement,
		anchor: props.container,
		onDismiss: handleDismiss,
		audioAlternative: audioAlternativeOffer(
			props,
			translator.isReady() ? translator.t("WIDGET.AUDIO_ALTERNATIVE") : "",
		),
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
		returnToCheckbox();
		if ("CAPTCHA.NO_SESSION_FOUND" !== store.state.error.key) {
			return;
		}
		// An internal recovery signal, not something the user should read: hold
		// the spinner while something re-mints. With no recovery route the
		// error stands, since a spinner that never resolves is worse.
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

		const showOverlay =
			"selecting" === iconOrderPhase || "submitting" === iconOrderPhase;

		if (showOverlay && null !== challengeData) {
			if (undefined === canvas) {
				canvas = mountIconOrderCanvas(canvasProps(challengeData));
			} else {
				canvas.update(canvasProps(challengeData));
			}
		} else {
			canvas?.destroy();
			canvas = undefined;
		}

		checkbox?.update(checkboxProps());
	};

	const scheduler = createRenderScheduler(render);

	const beginChallenge = async (coords?: ClickCoords): Promise<void> => {
		if (loading) {
			return;
		}
		loading = true;
		showRetry = false;
		scheduler.schedule();
		if (coords) {
			lastCoords = coords;
		}
		try {
			showChallenge(await manager.start(coords?.x, coords?.y));
		} catch (error) {
			// Failures already reach the user through state.error; rethrowing
			// would only be an unhandled rejection.
			reportError(error);
		} finally {
			loading = false;
			scheduler.schedule();
		}
	};

	const checkboxProps = (): CheckboxProps => ({
		checked: store.state.isHuman,
		theme,
		labelText: translator.isReady() ? translator.t("WIDGET.I_AM_HUMAN") : "",
		error: store.state.error
			? localiseErrorMessage(translator.i18n, store.state.error)
			: undefined,
		loadingText: translator.t("WIDGET.CHECKING", {
			defaultValue: "Checking that you are human",
		}),
		loading: loading || "submitting" === iconOrderPhase,
		onChange: (event: MouseEvent | KeyboardEvent | TouchEvent) =>
			beginChallenge(trustedClickCoords(event)),
	});

	// Invisible mode has no checkbox: the host page's execute() drives it.
	if (!isInvisible) {
		checkbox = mountCheckbox(root, checkboxProps());
	}

	teardown.add(scheduler.cancel);
	teardown.add(store.subscribe(scheduler.schedule));
	teardown.add(translator.subscribe(scheduler.schedule));

	// A bare execute() reaches every invisible widget via document; a targeted
	// one is dispatched on this widget's container and works in either mode.
	const handleExecute = () => {
		void beginChallenge();
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
			// Without WidgetFactory nothing has initialised i18n yet, so boot it
			// in the configured language rather than the detected one.
			void loadI18next(false, config.language);
		}
	}

	if (props.autoStart) {
		loading = true;
		// showRetry is deliberately left alone: an autoStart mount is how a
		// re-mint after a wrong answer arrives.
		const coords = props.startCoords;
		lastCoords = coords ?? null;
		scheduler.schedule();
		manager.start(coords?.x ?? 0, coords?.y ?? 0).then(
			(challenge: GetIconOrderCaptchaResponse | undefined) => {
				showChallenge(challenge);
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
			manager.dispose();
			teardown.run();
			canvas?.destroy();
			checkbox?.destroy();
			honeypot?.destroy();
			root.parentNode?.removeChild(root);
		},
	};
};

export default mountProcaptchaIconOrderWidget;
