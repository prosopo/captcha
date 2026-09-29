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

import type { ProcaptchaProps } from "@prosopo/types";
import {
	type Theme,
	canHover,
	darkTheme,
	isDevMode,
	lightTheme,
	randomToken,
} from "@prosopo/widget-skeleton";
import type { Component } from "../dom/component.js";
import { Teardown } from "../dom/component.js";
import { applyStyles, createElement } from "../dom/element.js";
import { isEventTrusted } from "../events/trust.js";

/** What a visual challenge needs to offer "use audio instead". */
export interface AudioAlternativeOffer {
	onRequestAudio: () => void;
	label: string;
}

export interface AudioAlternativeButtonProps extends AudioAlternativeOffer {
	themeColor: "light" | "dark";
}

/**
 * The offer a visual challenge should render, or `undefined` when the site has
 * not turned the audio alternative on. The audio challenge is English-only, so
 * an operator who has not opted in must not have it exposed.
 */
export const audioAlternativeOffer = (
	props: Pick<
		ProcaptchaProps,
		"audioAlternativeAvailable" | "onRequestAudioAlternative"
	>,
	label: string,
): AudioAlternativeOffer | undefined => {
	const onRequestAudio = props.onRequestAudioAlternative;
	if (!props.audioAlternativeAvailable || !onRequestAudio) {
		return undefined;
	}
	return { onRequestAudio, label };
};

/**
 * "Use audio instead" — the control that makes the visual challenges
 * escapable.
 *
 * Shared by the image, puzzle and icon-order widgets rather than duplicated
 * per widget, so the paths cannot drift into offering differently-worded or
 * differently-reachable escapes.
 *
 * Always a real `<button>` with visible text, unlike the reload control's
 * randomly drawn element and bare glyph. The people most likely to need this
 * control are the least likely to be able to inspect an unlabelled or
 * role-only control to find out what it does, and the visible text doubles as
 * the accessible name, so a screen reader and a sighted user are told the
 * same thing.
 */
export const mountAudioAlternativeButton = (
	container: HTMLElement,
	initialProps: AudioAlternativeButtonProps,
): Component<AudioAlternativeButtonProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let hover = false;
	let focusVisible = false;

	const button = createElement("button", {
		className: randomToken(),
		attributes: {
			type: "button",
			"data-cy": isDevMode() ? "prosopo-audio-alternative" : undefined,
		},
	});

	const render = () => {
		const theme = "light" === props.themeColor ? lightTheme : darkTheme;
		button.textContent = props.label;
		applyStyles(button, {
			border: "none",
			padding: "6px 10px",
			borderRadius: "8px",
			cursor: "pointer",
			fontFamily: theme.font.fontFamily,
			fontSize: "13px",
			textDecoration: "underline",
			color: theme.palette.primary.main,
			backgroundColor: hover
				? theme.palette.primaryContainer.hover
				: "transparent",
			transition: "background-color 0.25s",
			// Keyboard users are a core audience for this control, so the M3
			// focus ring is a requirement here rather than polish.
			outline: focusVisible
				? `3px solid ${theme.palette.primary.main}`
				: "none",
			outlineOffset: focusVisible ? "2px" : undefined,
		});
	};

	teardown.addEventListener(button, "click", (event: Event) => {
		if (!isEventTrusted(event)) {
			return;
		}
		event.preventDefault();
		props.onRequestAudio();
	});
	// See the reload control: a hover state layer costs a touch-screen
	// visitor their first tap on iOS.
	if (canHover()) {
		teardown.addEventListener(button, "mouseenter", () => {
			hover = true;
			render();
		});
		teardown.addEventListener(button, "mouseleave", () => {
			hover = false;
			render();
		});
	}
	teardown.addEventListener(button, "focus", () => {
		focusVisible = button.matches(":focus-visible");
		render();
	});
	teardown.addEventListener(button, "blur", () => {
		focusVisible = false;
		render();
	});
	render();
	container.appendChild(button);

	return {
		update: (nextProps: AudioAlternativeButtonProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			teardown.run();
			button.parentNode?.removeChild(button);
		},
	};
};

export interface AudioAlternativeFooterProps {
	offer: AudioAlternativeOffer | undefined;
	theme: Theme;
	/** Matches the challenge panel above it, so the two read as one card. */
	width: number;
}

/**
 * The strip under a canvas challenge (puzzle, icon order) that carries the
 * audio alternative: below the challenge so it reads as "or do this instead"
 * rather than as part of it. It takes over the card's rounded bottom corners,
 * so the panel above it has to square its own off while it is shown, or the
 * seam between two rounded edges shows.
 */
export const mountAudioAlternativeFooter = (
	container: HTMLElement,
	initialProps: AudioAlternativeFooterProps,
): Component<AudioAlternativeFooterProps> => {
	let props = initialProps;
	let button: Component<AudioAlternativeButtonProps> | undefined;

	const footer = createElement("div", {
		style: {
			borderRadius: "0 0 20px 20px",
			padding: "8px",
			boxSizing: "border-box",
			textAlign: "center",
		},
	});

	const render = () => {
		const { offer, theme, width } = props;
		applyStyles(footer, {
			display: undefined === offer ? "none" : "block",
			backgroundColor: theme.palette.surface,
			width: `${width}px`,
		});
		if (undefined === offer) {
			button?.destroy();
			button = undefined;
			return;
		}
		const buttonProps: AudioAlternativeButtonProps = {
			...offer,
			themeColor: "dark" === theme.palette.mode ? "dark" : "light",
		};
		if (undefined === button) {
			button = mountAudioAlternativeButton(footer, buttonProps);
		} else {
			button.update(buttonProps);
		}
	};

	render();
	container.appendChild(footer);

	return {
		update: (nextProps: AudioAlternativeFooterProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			button?.destroy();
			button = undefined;
			footer.parentNode?.removeChild(footer);
		},
	};
};
