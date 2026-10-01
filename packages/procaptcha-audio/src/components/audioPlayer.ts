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

import type { TranslationKey, Translator } from "@prosopo/locale";
import {
	type ChallengeSurfaceComponent,
	type ChallengeSurfaceProps,
	type Component,
	type StyleMap,
	Teardown,
	applyAttributes,
	applyStyles,
	createElement,
	mountChallengeSurface,
} from "@prosopo/procaptcha-common";
import type { AudioEvent, PlacementType } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";

export interface AudioPlayerProps {
	/** RIFF/WAVE clip as a data URI. */
	clip: string;
	/** How many characters the user must type. */
	characterCount: number;
	onComplete: (
		answer: string,
		replays: number,
		audioEvents: AudioEvent[],
	) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	translator: Translator;
	placement?: PlacementType;
	anchor?: HTMLElement | null;
	onDismiss?: () => void;
}

const CONTAINER_WIDTH = 320;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-audio-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

const VISUALLY_HIDDEN: StyleMap = {
	position: "absolute",
	width: "1px",
	height: "1px",
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
};

/**
 * The audio challenge UI.
 *
 * Accessibility is the point of this widget, not a finishing touch, so a few
 * things here are load-bearing rather than cosmetic:
 *
 * - Every control is a real `<button>` or `<input>`, never a generic element
 *   given a role, so a screen reader and a keyboard get the native semantics.
 * - The `<audio>` element is hidden with its own controls suppressed and driven
 *   by our buttons. Native controls vary between browsers and several expose a
 *   download link, which would hand the clip over as a file.
 * - Status changes are announced through a polite live region. Without it a
 *   screen-reader user gets no feedback that a wrong answer was rejected and a
 *   new clip is waiting; the visual shake is invisible to them. Polite rather
 *   than assertive so it does not talk over a user who is typing.
 * - Autoplay is never attempted. Browsers block audio without a user gesture,
 *   and a blocked play() looks identical to a broken widget.
 */
export const mountAudioPlayer = (
	initialProps: AudioPlayerProps,
): Component<AudioPlayerProps> => {
	const teardown = new Teardown();
	let props = initialProps;

	let answer = "";
	let playing = false;
	let visible = false;
	let shaking = false;
	let shakeTimer: ReturnType<typeof setTimeout> | undefined;

	// `replays` counts plays after the first, so 0 means "heard it once and
	// typed the answer" — which is the value a solver that never renders the
	// audio will always report.
	let replays = 0;
	let hasPlayed = false;
	let events: AudioEvent[] = [];
	let startedAt = Date.now();

	const t = (key: TranslationKey, options?: Record<string, unknown>): string =>
		props.translator.t(key, options);

	const record = (kind: AudioEvent["kind"]) => {
		events.push({ kind, t: Date.now() - startedAt });
	};

	const style = createElement("style", { text: SHAKE_KEYFRAMES });

	const instruction = createElement("p", {
		style: { margin: 0, fontSize: "14px" },
	});

	// No `controls` attribute, for the download reason above. `preload="auto"`
	// because the clip is already a data URI: there is nothing to fetch, and it
	// means play() responds immediately.
	const audio = createElement("audio", {
		attributes: { preload: "auto" },
		style: { display: "none" },
	});

	const playButton = createElement("button", {
		attributes: { type: "button" },
	});

	const playRow = createElement("div", {
		style: { display: "flex", gap: "8px" },
		children: [playButton],
	});

	// `inputmode="numeric"` brings up a number pad on mobile without the
	// validation baggage of `type="number"`, which also strips leading zeros —
	// fatal when the answer can start with one. `autocomplete="off"` keeps
	// password managers and previous answers out of the field.
	const input = createElement("input", {
		attributes: {
			type: "text",
			inputmode: "numeric",
			autocomplete: "off",
			autocorrect: "off",
			autocapitalize: "off",
			spellcheck: "false",
		},
	});

	const submitButton = createElement("button", {
		attributes: { type: "button" },
	});

	const announcer = createElement("div", {
		attributes: { "aria-live": "polite", "aria-atomic": "true" },
		style: VISUALLY_HIDDEN,
	});

	// Test-only selectors: gated on NODE_ENV !== "production" so the bundler
	// constant-folds them out of production builds.
	if ("production" !== process.env.NODE_ENV) {
		applyAttributes(audio, { "data-cy": "prosopo-audio-clip" });
		applyAttributes(playButton, { "data-cy": "prosopo-audio-play" });
		applyAttributes(input, { "data-cy": "prosopo-audio-answer" });
		applyAttributes(submitButton, { "data-cy": "prosopo-audio-submit" });
	}

	const panel = createElement("div", {
		style: {
			position: "relative",
			display: "flex",
			flexDirection: "column",
			gap: "14px",
			width: `${CONTAINER_WIDTH}px`,
			boxSizing: "border-box",
			padding: "20px",
			borderRadius: "20px",
			transition: "opacity 0.3s ease, transform 0.3s ease",
		},
		children: [instruction, audio, playRow, input, submitButton, announcer],
	});

	const surfaceProps = (): ChallengeSurfaceProps => ({
		show: true,
		placement: props.placement,
		anchor: props.anchor,
		onDismiss: props.onDismiss,
		scrim: visible ? "dim" : "none",
		dialogLabel: t("WIDGET.AUDIO_CHALLENGE_LABEL"),
	});

	const surface: ChallengeSurfaceComponent = mountChallengeSurface(
		surfaceProps(),
	);
	surface.content.append(style, panel);

	const announce = (message: string) => {
		announcer.textContent = message;
	};

	const playLabel = (): string => {
		if (playing) {
			return t("WIDGET.AUDIO_PLAYING");
		}
		return hasPlayed || answer.length > 0
			? t("WIDGET.AUDIO_REPLAY")
			: t("WIDGET.AUDIO_PLAY");
	};

	const render = () => {
		const { theme, showRetry, submitting, characterCount } = props;
		const accent = showRetry
			? theme.palette.error.main
			: theme.palette.primary.main;
		const blocked = submitting || 0 === answer.length;

		const buttonStyle: StyleMap = {
			fontFamily: theme.font.fontFamily,
			fontSize: "14px",
			padding: "10px 16px",
			borderRadius: "8px",
			border: `1px solid ${accent}`,
			backgroundColor: "transparent",
			color: accent,
			cursor: "pointer",
		};

		applyStyles(panel, {
			backgroundColor: theme.palette.surface,
			color: theme.palette.onSurface,
			fontFamily: theme.font.fontFamily,
			opacity: visible ? 1 : 0,
			transform: visible ? "scale(1)" : "scale(0.9)",
			animation: shaking ? "prosopo-audio-shake 0.5s ease" : "none",
		});

		instruction.textContent = showRetry
			? t("WIDGET.AUDIO_INCORRECT")
			: t("WIDGET.AUDIO_INSTRUCTIONS", { count: characterCount });
		applyStyles(instruction, {
			color: showRetry ? theme.palette.error.main : theme.palette.onSurface,
		});

		if (audio.getAttribute("src") !== props.clip) {
			audio.setAttribute("src", props.clip);
		}

		playButton.textContent = playLabel();
		applyStyles(playButton, { ...buttonStyle, flex: 1 });

		input.maxLength = characterCount * 2;
		input.disabled = submitting;
		if (input.value !== answer) {
			input.value = answer;
		}
		applyAttributes(input, {
			"aria-label": t("WIDGET.AUDIO_INPUT_LABEL", { count: characterCount }),
		});
		applyStyles(input, {
			fontFamily: theme.font.fontFamily,
			fontSize: "18px",
			letterSpacing: "0.3em",
			textAlign: "center",
			padding: "10px",
			borderRadius: "8px",
			border: `1px solid ${accent}`,
			backgroundColor: "transparent",
			color: theme.palette.onSurface,
		});

		submitButton.textContent = submitting
			? t("WIDGET.AUDIO_CHECKING")
			: t("WIDGET.AUDIO_SUBMIT");
		submitButton.disabled = blocked;
		// Always the primary fill, even on retry: a red "Verify" reads as a
		// destructive action rather than "your last answer was wrong", and the
		// message, the shake and the input border already say that.
		applyStyles(submitButton, {
			...buttonStyle,
			backgroundColor: theme.palette.primary.main,
			borderColor: theme.palette.primary.main,
			color: theme.palette.primary.contrastText,
			opacity: blocked ? 0.5 : 1,
			cursor: blocked ? "not-allowed" : "pointer",
		});

		surface.update(surfaceProps());
	};

	const play = () => {
		// Every press after the first is a replay, whether or not the clip got
		// far enough to advance `currentTime` — a user who presses play twice in
		// quick succession has still asked to hear it twice.
		const isReplay = hasPlayed;
		audio.currentTime = 0;
		record(isReplay ? "replay" : "play");
		if (isReplay) {
			replays += 1;
		}
		hasPlayed = true;
		const clipAtPlay = props.clip;
		// A rejection is the browser blocking playback or the device having no
		// audio output. Saying so matters: this is the one widget where the
		// user cannot fall back to looking at it.
		void audio.play().then(
			() => {
				if (clipAtPlay !== props.clip) {
					return;
				}
				playing = true;
				announce(t("WIDGET.AUDIO_PLAYING"));
				render();
			},
			() => {
				playing = false;
				announce(t("WIDGET.AUDIO_PLAYBACK_FAILED"));
				render();
			},
		);
		render();
	};

	const submit = () => {
		if (props.submitting || 0 === answer.length) {
			return;
		}
		props.onComplete(answer, replays, [...events]);
	};

	teardown.addEventListener(playButton, "click", play);
	teardown.addEventListener(submitButton, "click", submit);
	teardown.addEventListener(input, "input", () => {
		record("key");
		answer = input.value;
		render();
	});
	teardown.addEventListener(input, "keydown", (event: Event) => {
		if ("Enter" !== (event as KeyboardEvent).key) {
			return;
		}
		event.preventDefault();
		submit();
	});
	teardown.addEventListener(audio, "ended", () => {
		playing = false;
		announce(t("WIDGET.AUDIO_FINISHED"));
		render();
	});
	teardown.addEventListener(audio, "pause", () => {
		playing = false;
		render();
	});

	/**
	 * The clip URI is the challenge's identity, so a new clip is a new attempt
	 * and the telemetry starts over — otherwise a retry would report replays
	 * from the challenge the user has already failed. The outgoing clip is
	 * stopped too: swapping `src` resets the element, but not before the
	 * browser may have played another frame of the old one over the new.
	 */
	const resetForNewClip = () => {
		audio.pause();
		audio.currentTime = 0;
		answer = "";
		playing = false;
		replays = 0;
		hasPlayed = false;
		events = [];
		startedAt = Date.now();
	};

	const startShake = () => {
		shaking = true;
		announce(t("WIDGET.AUDIO_INCORRECT"));
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
		shakeTimer = setTimeout(() => {
			shakeTimer = undefined;
			shaking = false;
			render();
		}, 500);
	};

	teardown.add(() => {
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
	});

	if (props.showRetry) {
		startShake();
	}

	render();
	// Lands a keyboard user where the work is rather than on the play button
	// the dialog would otherwise hand focus to.
	input.focus();

	const frameRequest = requestAnimationFrame(() => {
		visible = true;
		render();
	});
	teardown.add(() => cancelAnimationFrame(frameRequest));

	return {
		update: (nextProps: AudioPlayerProps) => {
			const previous = props;
			props = nextProps;
			if (nextProps.clip !== previous.clip) {
				resetForNewClip();
			}
			if (nextProps.showRetry && !previous.showRetry) {
				startShake();
			}
			render();
		},
		destroy: () => {
			teardown.run();
			audio.pause();
			surface.destroy();
		},
	};
};
