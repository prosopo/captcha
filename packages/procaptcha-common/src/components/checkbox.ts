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
	WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
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
}

const CHECKBOX_STYLE_ID = "checkbox";
const LABEL_CLASS = "prosopo-checkbox__label";
const BOX_CLASS = "prosopo-checkbox__box";

const ID_LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const FAQ_LINK = process.env.PROSOPO_DOCS_URL
	? `${new URL(`${process.env.PROSOPO_DOCS_URL}/en/basics/faq/`).href}/`
	: "https://docs.prosopo.io/en/basics/faq/";

const generateRandomId = (): string =>
	Array.from(
		{ length: 8 },
		() => ID_LETTERS[Math.floor(Math.random() * ID_LETTERS.length)],
	).join("");

const baseStyle: StyleMap = {
	width: "28px",
	height: "28px",
	minWidth: "14px",
	minHeight: "14px",
	top: "auto",
	left: "auto",
	opacity: "1",
	borderRadius: "12.5%",
	appearance: "none",
	cursor: "pointer",
	margin: "0",
	borderStyle: "solid",
	borderWidth: "1px",
	flex: 1,
	marginTop: "15px",
	marginRight: "15px",
	marginBottom: "15px",
	marginLeft: "15px",
};

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
const checkboxCss = (theme: Theme): string => `
.${LABEL_CLASS} {
	color: ${theme.palette.background.contrastText};
	position: relative;
	display: flex !important;
	cursor: pointer;
	user-select: none;
	font-weight: normal;
	font-family: ${theme.font.fontFamily};
}

@container prosopo-widget (max-width: 169px) {
	.${LABEL_CLASS} {
		display: none;
	}
}

@container prosopo-widget (min-width: 170px) {
	.${LABEL_CLASS} {
		font-size: 10px;
	}
}

@container prosopo-widget (min-width: 220px) {
	.${LABEL_CLASS} {
		font-size: 12px;
	}
}

@container prosopo-widget (min-width: 250px) {
	.${LABEL_CLASS} {
		font-size: 14px;
	}
}

@container prosopo-widget (min-width: 270px) {
	.${LABEL_CLASS} {
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

	teardown.add(
		injectStyle(container, CHECKBOX_STYLE_ID, checkboxCss(props.theme)),
	);

	const root = createElement("span", {
		style: {
			display: "inline-flex",
			alignItems: "center",
			minHeight: "58px",
		},
	});

	const spinner = createElement("div", {
		className: WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
		attributes: { "aria-label": "Loading spinner" },
	});

	const input = createElement("input", {
		className: BOX_CLASS,
		attributes: {
			type: "checkbox",
			"aria-live": "assertive",
			"data-cy": "captcha-checkbox",
		},
	});

	const label = createElement("label", { className: LABEL_CLASS });

	const applyBoxStyle = () => {
		applyStyles(input, {
			...baseStyle,
			border: `1px solid ${props.theme.palette.background.contrastText}`,
			borderColor: hover
				? props.theme.palette.background.contrastText
				: props.theme.palette.border,
			appearance: props.checked ? "auto" : "none",
			minWidth: "28px",
			minHeight: "28px",
		});
	};

	teardown.addEventListener(input, "mouseenter", () => {
		hover = true;
		applyBoxStyle();
	});
	teardown.addEventListener(input, "mouseleave", () => {
		hover = false;
		applyBoxStyle();
	});

	const activate = (event: MouseEvent | KeyboardEvent) => {
		if (!event.isTrusted) {
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
		if (undefined !== props.error) {
			const link = createElement("a", {
				attributes: { href: FAQ_LINK },
				text: props.error,
			});
			applyStyles(link, { color: props.theme.palette.error.main });
			label.appendChild(link);
			return;
		}
		label.textContent = props.labelText;
	};

	const render = () => {
		const control = props.loading ? spinner : input;
		if (control.parentNode !== root) {
			clearElement(root);
			root.appendChild(control);
			root.appendChild(label);
		}

		if (!props.loading) {
			// Regenerated per render, as the React component did — the id is only
			// ever a per-instance handle, never referenced across renders.
			const id = generateRandomId();
			input.id = id;
			input.name = id;
			input.setAttribute("aria-label", props.labelText);
			input.checked = props.checked;
			input.disabled = undefined !== props.error;
			applyBoxStyle();
		}

		renderLabel();
	};

	render();
	container.appendChild(root);

	return {
		update: (nextProps: CheckboxProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			teardown.run();
			root.parentNode?.removeChild(root);
		},
	};
};
