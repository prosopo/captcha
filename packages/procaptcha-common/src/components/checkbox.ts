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
	type Theme,
	canHover,
	isDevMode,
	randomToken,
	withAlpha,
} from "@prosopo/widget-skeleton";
import type { Component } from "../dom/component.js";
import { Teardown } from "../dom/component.js";
import {
	type StyleMap,
	applyStyles,
	clearElement,
	createElement,
} from "../dom/element.js";
import { injectStyle } from "../dom/styleSheet.js";
import { isEventTrusted } from "../events/trust.js";

/**
 * The checkbox is activated by a real pointer click or by Enter, so the handler
 * sees the raw DOM event rather than a synthetic one. Coordinate capture reads
 * `clientX`/`clientY` off it directly — the click path is what carries them,
 * which is why this listens for `click` and not `change`.
 */
export type CheckboxChangeHandler = (
	event: MouseEvent | KeyboardEvent | TouchEvent,
) => Promise<void> | void;

export interface CheckboxProps {
	theme: Theme;
	checked: boolean;
	onChange: CheckboxChangeHandler;
	labelText: string;
	error?: string;
	loading: boolean;
	/** Name for the spinner that stands in for the box while it is working. */
	loadingText?: string;
}

const DEFAULT_LOADING_TEXT = "Checking that you are human";

const CHECKBOX_STYLE_ID = "checkbox";

/**
 * Class names, drawn once per mounted widget, so a selector scraped from one
 * page load does not hold on the next.
 */
interface CheckboxNames {
	readonly box: string;
	readonly label: string;
	readonly spinner: string;
	readonly spin: string;
	readonly instance: string;
}

const generateNames = (): CheckboxNames => ({
	box: randomToken(),
	label: randomToken(),
	spinner: randomToken(),
	spin: randomToken(),
	instance: randomToken(),
});

const FAQ_LINK = process.env.PROSOPO_DOCS_URL
	? new URL(
			`${process.env.PROSOPO_DOCS_URL.replace(/\/+$/, "")}/en/basics/faq/`,
		).href
	: "https://docs.prosopo.io/en/basics/faq/";

/**
 * Whether nothing on the page holds focus, which is where the browser leaves it
 * when the focused element is removed.
 */
const focusIsStranded = (element: HTMLElement): boolean => {
	const { activeElement, body } = element.ownerDocument;
	return null === activeElement || activeElement === body;
};

// 28px container with a 2dp stroke, centred in a 58px touch target. Larger
// than the 18dp M3 checkbox spec — kept at the original size deliberately, as
// the widget needs a more prominent target than a form checkbox.
const CHECKBOX_SIZE = "28px";

// 15px each side around a 28px box gives a 58px margin box, so nothing on the
// page reflows.
const MARGIN_TOTAL = 30;
const MARGIN_EACH_SIDE = MARGIN_TOTAL / 2;

const baseStyle = (): StyleMap => ({
	width: CHECKBOX_SIZE,
	height: CHECKBOX_SIZE,
	minWidth: CHECKBOX_SIZE,
	minHeight: CHECKBOX_SIZE,
	top: "auto",
	left: "auto",
	opacity: "1",
	appearance: "none",
	cursor: "pointer",
	margin: `${MARGIN_EACH_SIDE}px`,
	borderStyle: "solid",
	borderWidth: "2px",
});

// The label sizes itself against the `prosopo-widget` container declared on
// `.prosopo-widget__wrapper` out in the light DOM. Container queries resolve
// through the shadow boundary, so the rules work from inside the checkbox's
// shadow root exactly as they did when Emotion emitted them there.
//
// The old component also carried a `&:before` rule with `content: '""'`. It was
// written inside a stray pair of braces, so Emotion emitted it with an empty
// selector — invalid CSS that every browser dropped, meaning it never applied.
// Porting it faithfully made it valid for the first time and painted a literal
// pair of quote marks inside the box, so it is gone rather than reproduced: an
// absolutely positioned, empty pseudo-element on the checkbox did nothing.
// The container name is declared on `.prosopo-widget__wrapper` out in the light
// DOM, where a consumer's own CSS may also rely on it, so it is one of the few
// names that stays fixed.
const checkboxCss = (theme: Theme, names: CheckboxNames): string => `
/* In forced-colors mode (Windows High Contrast) backgrounds are overridden, so
   the custom-painted tick can disappear — fall back to the native control,
   which the OS draws in system colors. !important beats the inline styles. */
@media (forced-colors: active) {
	.${names.box} {
		appearance: auto !important;
		background-image: none !important;
	}
}

/* M3 focus indicator: a 3dp outline offset by 2dp, drawn only for keyboard
   focus. The control previously had no focus affordance at all. */
.${names.box}:focus-visible {
	outline: 3px solid ${theme.palette.primary.main};
	outline-offset: 2px;
}

/* The spinner stands in for the box, so it takes the same margin — otherwise
   the widget would twitch every time a check started. These rules used to live
   in widget-skeleton's sheet, which this component happened to render inside. */
.${names.spinner} {
	margin: ${MARGIN_EACH_SIDE}px !important;
	width: 28px !important;
	height: 28px !important;
	border: 4px solid ${theme.palette.border};
	border-bottom-color: ${theme.palette.primary.main};
	border-radius: 50%;
	display: inherit;
	box-sizing: border-box;
	animation: ${names.spin} 1s linear infinite;
	will-change: transform;
}

@keyframes ${names.spin} {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.${names.label} {
	/* The label sits on the widget surface, so it takes onSurface — not the
	   dialog container's on-colour. */
	color: ${theme.palette.onSurface};
	position: relative;
	display: flex !important;
	cursor: pointer;
	user-select: none;
	font-weight: normal;
	font-family: ${theme.font.fontFamily};
}

@container prosopo-widget (max-width: 169px) {
	.${names.label} {
		display: none;
	}
}

@container prosopo-widget (min-width: 170px) {
	.${names.label} {
		font-size: 10px;
	}
}

@container prosopo-widget (min-width: 220px) {
	.${names.label} {
		font-size: 12px;
	}
}

@container prosopo-widget (min-width: 250px) {
	.${names.label} {
		font-size: 14px;
	}
}

@container prosopo-widget (min-width: 270px) {
	.${names.label} {
		font-size: 16px;
	}
}
`;

export const mountCheckbox = (
	container: HTMLElement,
	initialProps: CheckboxProps,
): Component<CheckboxProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let hover = false;
	let hadFocus = false;

	const names = generateNames();

	// The sheet bakes in theme tokens, so light and dark are separate documents
	// rather than one that gets rewritten. It also bakes in this instance's
	// class names, so the id carries them too — two checkboxes in one container
	// no longer describe the same elements and must not share a tag.
	const styleIdFor = (theme: Theme): string =>
		`${CHECKBOX_STYLE_ID}-${names.instance}-${theme.palette.mode}`;

	let styleMode = props.theme.palette.mode;
	let disposeStyle = injectStyle(
		container,
		styleIdFor(props.theme),
		checkboxCss(props.theme, names),
	);
	teardown.add(() => disposeStyle());

	const root = createElement("span", {
		style: {
			display: "inline-flex",
			alignItems: "center",
			minHeight: "58px",
		},
	});

	const spinner = createElement("div", {
		className: names.spinner,
		attributes: {
			role: "status",
			// Focusable only programmatically: it stands in for the input it
			// replaced, so its name is what a screen reader reads when focus is
			// handed over.
			tabindex: "-1",
		},
	});

	const input = createElement("input", {
		className: names.box,
		attributes: {
			type: "checkbox",
			// A stable selector for the one control a solver wants to click, so
			// it is a test hook only — the skeleton withholds it the same way.
			"data-cy": isDevMode() ? "captcha-checkbox" : undefined,
		},
	});

	const label = createElement("label", { className: names.label });

	// The error replaces the label in place, which a screen reader does not
	// notice; a live region that exists from mount gets it announced.
	const announcer = createElement("span", {
		attributes: { "aria-live": "polite", "aria-atomic": "true" },
		style: {
			position: "absolute",
			width: "1px",
			height: "1px",
			overflow: "hidden",
			clip: "rect(0 0 0 0)",
			whiteSpace: "nowrap",
		},
	});

	const applyBoxStyle = () => {
		const { theme, checked } = props;
		// White (token) tick painted directly onto the box so the checked state is
		// identical in light and dark mode — the native control can't be themed.
		const tickColor = encodeURIComponent(theme.palette.checkbox.tick);
		const checkImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='${tickColor}' d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E")`;
		// M3 hover feedback is a state layer — the on-colour at 8% expressed as a
		// spread ring around the container — not a change of stroke colour.
		const stateLayerColor = checked
			? theme.palette.checkbox.fill
			: theme.palette.onSurface;
		applyStyles(input, {
			...baseStyle(),
			borderRadius: theme.shape.checkbox,
			borderColor: checked
				? theme.palette.checkbox.fill
				: theme.palette.checkbox.border,
			backgroundColor: checked
				? theme.palette.checkbox.fill
				: theme.palette.surface,
			backgroundImage: checked ? checkImage : "none",
			backgroundRepeat: "no-repeat",
			backgroundPosition: "center",
			// Tick inset within the 28px container.
			backgroundSize: "20px 20px",
			boxShadow: hover
				? `0 0 0 10px ${withAlpha(stateLayerColor, theme.stateLayer.hover)}`
				: "none",
			transition:
				"background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
		});
	};

	// Removing a focused element drops focus to the body without firing blur,
	// so this survives the swap below and says whether the swap cost the user
	// their place on the page.
	teardown.addEventListener(input, "focus", () => {
		hadFocus = true;
	});
	teardown.addEventListener(input, "blur", () => {
		hadFocus = false;
	});

	// Only where a pointer can rest on the control. On a touch screen the
	// state layer costs the visitor their first tap: iOS reads a tap that
	// changes what is under the finger as "show me the hover state" and
	// withholds the click, so the control has to be tapped twice.
	if (canHover()) {
		teardown.addEventListener(input, "mouseenter", () => {
			hover = true;
			applyBoxStyle();
		});
		teardown.addEventListener(input, "mouseleave", () => {
			hover = false;
			applyBoxStyle();
		});
	}

	const activate = (event: MouseEvent | KeyboardEvent) => {
		if (!isEventTrusted(event)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		hover = false;
		applyBoxStyle();
		// The input is controlled by `props.checked`; `preventDefault` above stops
		// the browser toggling it, and this restores the box if anything already
		// flipped it, matching how React reset a controlled input on re-render.
		input.checked = props.checked;
		void props.onChange(event);
	};

	teardown.addEventListener(input, "click", (event: Event) => {
		activate(event as MouseEvent);
	});
	teardown.addEventListener(input, "keydown", (event: Event) => {
		const keyboardEvent = event as KeyboardEvent;
		if ("Enter" !== keyboardEvent.key) {
			return;
		}
		activate(keyboardEvent);
	});

	const renderLabel = () => {
		clearElement(label);
		const announcement = props.error ?? "";
		if (announcer.textContent !== announcement) {
			announcer.textContent = announcement;
		}
		if (undefined !== props.error) {
			// The error text carries a support code, so it has to be selectable —
			// the label's `user-select: none` is overridden for this state only.
			applyStyles(label, { userSelect: "text", cursor: "text" });
			const link = createElement("a", {
				attributes: { href: FAQ_LINK },
				text: props.error,
			});
			applyStyles(link, {
				color: props.theme.palette.error.main,
				userSelect: "text",
			});
			label.appendChild(link);
			return;
		}
		applyStyles(label, { userSelect: undefined, cursor: undefined });
		label.textContent = props.labelText;
	};

	// The spinner replaces the box in the DOM rather than covering it, which
	// strands a keyboard user at the top of the page for as long as the check
	// runs, with nothing said about why the box vanished. Handing focus across
	// the swap and back keeps them where they were and gets each side's name
	// read out as it arrives.
	//
	// Only focus the swap itself stranded is claimed back. The check lasts as
	// long as the network does, and a user who spent that time moving on to the
	// host page's own fields would otherwise be dragged out of them, mid
	// keystroke, by a widget they had finished with.
	const restoreFocusAfterSwap = (control: HTMLElement) => {
		if (!hadFocus || !focusIsStranded(control)) {
			return;
		}
		control.focus();
	};

	const render = () => {
		const control = props.loading ? spinner : input;
		const swapped = control.parentNode !== root;
		if (swapped) {
			clearElement(root);
			root.appendChild(control);
			root.appendChild(label);
		}

		if (props.loading) {
			spinner.setAttribute(
				"aria-label",
				props.loadingText ?? DEFAULT_LOADING_TEXT,
			);
		} else {
			// Regenerated per render, as the React component did — the id is only
			// ever a per-instance handle, never referenced across renders.
			const id = randomToken();
			input.id = id;
			input.name = id;
			label.htmlFor = id;
			input.setAttribute("aria-label", props.labelText);
			input.checked = props.checked;
			input.disabled = undefined !== props.error;
			applyBoxStyle();
		}

		renderLabel();

		if (swapped) {
			restoreFocusAfterSwap(control);
		}
	};

	render();
	container.appendChild(root);
	container.appendChild(announcer);

	return {
		update: (nextProps: CheckboxProps) => {
			props = nextProps;
			// `render` re-applies the inline box styles from the new theme, but the
			// stylesheet holds the label colour, font and focus ring — it has to be
			// swapped explicitly, where Emotion used to regenerate it per render.
			if (props.theme.palette.mode !== styleMode) {
				disposeStyle();
				styleMode = props.theme.palette.mode;
				disposeStyle = injectStyle(
					container,
					styleIdFor(props.theme),
					checkboxCss(props.theme, names),
				);
			}
			render();
		},
		destroy: () => {
			teardown.run();
			root.parentNode?.removeChild(root);
			announcer.remove();
		},
	};
};
