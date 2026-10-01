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
	isDevMode,
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
	theme: Theme;
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
 * "Use audio instead". Unlike the reload control's randomised element and bare
 * glyph, always a real `<button>` whose visible text is its accessible name:
 * the people who need it are the least able to work out an unlabelled control.
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
		const { theme } = props;
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
	// A hover state layer costs an iOS visitor their first tap.
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

export interface AudioAlternativeSlotProps {
	offer: AudioAlternativeOffer | undefined;
	theme: Theme;
}

/** Holds the button in `host` while there is an offer, and hides `host` otherwise. */
export const mountAudioAlternativeSlot = (
	host: HTMLElement,
	initialProps: AudioAlternativeSlotProps,
): Component<AudioAlternativeSlotProps> => {
	let button: Component<AudioAlternativeButtonProps> | undefined;

	const render = ({ offer, theme }: AudioAlternativeSlotProps) => {
		host.style.display = undefined === offer ? "none" : "";
		if (undefined === offer) {
			button?.destroy();
			button = undefined;
			return;
		}
		const buttonProps: AudioAlternativeButtonProps = { ...offer, theme };
		if (undefined === button) {
			button = mountAudioAlternativeButton(host, buttonProps);
		} else {
			button.update(buttonProps);
		}
	};

	render(initialProps);

	return {
		update: render,
		destroy: () => {
			button?.destroy();
			button = undefined;
		},
	};
};

export interface AudioAlternativeFooterProps extends AudioAlternativeSlotProps {
	/** Matches the challenge panel above it, so the two read as one card. */
	width: number;
}

/**
 * The strip under a canvas challenge that carries the audio alternative. It
 * takes over the card's rounded bottom corners, so the panel above has to
 * square its own off while the strip is shown.
 */
export const mountAudioAlternativeFooter = (
	container: HTMLElement,
	initialProps: AudioAlternativeFooterProps,
): Component<AudioAlternativeFooterProps> => {
	const footer = createElement("div", {
		style: {
			borderRadius: "0 0 20px 20px",
			padding: "8px",
			boxSizing: "border-box",
			textAlign: "center",
		},
	});
	const slot = mountAudioAlternativeSlot(footer, initialProps);

	const render = (props: AudioAlternativeFooterProps) => {
		applyStyles(footer, {
			backgroundColor: props.theme.palette.surface,
			width: `${props.width}px`,
		});
		slot.update(props);
	};

	render(initialProps);
	container.appendChild(footer);

	return {
		update: render,
		destroy: () => {
			slot.destroy();
			footer.parentNode?.removeChild(footer);
		},
	};
};
