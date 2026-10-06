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
	canHover,
	darkTheme,
	isDevMode,
	lightTheme,
	randomToken,
} from "@prosopo/widget-skeleton";
import type { Component } from "../dom/component.js";
import { Teardown } from "../dom/component.js";
import {
	type StyleMap,
	applyStyles,
	createElement,
	createSvgElement,
} from "../dom/element.js";
import { createControl } from "../dom/obfuscation.js";

export interface ImageSwitchButtonProps {
	themeColor: "light" | "dark";
	onSwitch: () => void;
	/** Accessible name, and the tooltip on the icon-only variant. */
	label: string;
	/**
	 * Drawn as a filled pill with `labelledText` beside the icon instead of a
	 * bare icon, for a user who looks to be struggling.
	 */
	labelled?: boolean;
	labelledText?: string;
}

// A 3×3 grid, the shape of the image challenge itself. A photo glyph reads as
// "view" or "upload" rather than "a different kind of challenge".
const GRID_CELLS: readonly [number, number][] = [
	[3, 3],
	[10, 3],
	[17, 3],
	[3, 10],
	[10, 10],
	[17, 10],
	[3, 17],
	[10, 17],
	[17, 17],
];
const GRID_CELL_SIZE = 5;

const prefersReducedMotion = (): boolean =>
	"function" === typeof window.matchMedia &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const iconButtonStyle: StyleMap = {
	border: "none",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "50%",
	padding: "4px",
	height: "24px",
	width: "24px",
	gap: "0",
};

const labelledButtonStyle: StyleMap = {
	border: "none",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "999px",
	padding: "8px 16px",
	height: "auto",
	width: "auto",
	gap: "8px",
	fontSize: "13px",
	fontWeight: 500,
	lineHeight: "16px",
};

export const mountImageSwitchButton = (
	container: HTMLElement,
	initialProps: ImageSwitchButtonProps,
): Component<ImageSwitchButtonProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let hover = false;
	let focusVisible = false;

	const themeFor = (themeColor: "light" | "dark") =>
		"light" === themeColor ? lightTheme : darkTheme;

	const cells = GRID_CELLS.map(([x, y]) =>
		createSvgElement("rect", {
			attributes: {
				x: String(x),
				y: String(y),
				width: String(GRID_CELL_SIZE),
				height: String(GRID_CELL_SIZE),
				rx: "1",
			},
		}),
	);

	const svg = createSvgElement("svg", {
		attributes: {
			width: "16px",
			height: "16px",
			viewBox: "0 0 25 25",
			"aria-hidden": "true",
		},
		style: { display: "flex", flexShrink: "0" },
		children: cells,
	});

	const text = createElement("span");

	const button = createControl(teardown, {
		className: randomToken(),
		attributes: {
			"aria-label": props.label,
			"data-cy": isDevMode() ? "image-switch-button" : undefined,
		},
		children: [svg, text],
		onActivate: (event: MouseEvent | KeyboardEvent) => {
			event.preventDefault();
			props.onSwitch();
		},
	});

	// Hover alone cannot explain an icon: there is no hover on a touch screen.
	// The tooltip is for pointer and keyboard users; touch users get the
	// labelled variant once they look to be struggling.
	const tooltip = createElement("span", {
		attributes: { role: "tooltip", "aria-hidden": "true" },
		style: {
			position: "absolute",
			top: "calc(100% + 6px)",
			left: "0",
			whiteSpace: "nowrap",
			padding: "4px 8px",
			borderRadius: "4px",
			fontSize: "12px",
			fontWeight: 400,
			lineHeight: "16px",
			pointerEvents: "none",
			zIndex: "1",
		},
	});

	const wrapper = createElement("div", {
		style: { position: "relative", display: "inline-flex" },
		children: [button, tooltip],
	});

	const render = () => {
		const theme = themeFor(props.themeColor);
		const labelled = true === props.labelled;
		button.setAttribute("aria-label", props.label);
		text.textContent = labelled ? (props.labelledText ?? props.label) : "";
		const fill = labelled
			? theme.palette.primary.contrastText
			: theme.palette.primaryContainer.contrastText;
		for (const cell of cells) {
			cell.setAttribute("fill", fill);
		}
		applyStyles(text, { display: labelled ? "inline" : "none" });
		applyStyles(button, {
			...(labelled ? labelledButtonStyle : iconButtonStyle),
			outline: focusVisible
				? `3px solid ${theme.palette.primary.main}`
				: "none",
			outlineOffset: focusVisible ? "2px" : undefined,
			backgroundColor: labelled
				? theme.palette.primary.main
				: hover
					? theme.palette.primaryContainer.hover
					: theme.palette.primaryContainer.main,
			color: fill,
			fontFamily: theme.font.fontFamily,
			transition: prefersReducedMotion()
				? "none"
				: "background-color 0.25s, padding 0.25s",
			filter: labelled && hover ? "brightness(1.08)" : "none",
		});
		tooltip.textContent = props.label;
		applyStyles(tooltip, {
			display: !labelled && (hover || focusVisible) ? "block" : "none",
			backgroundColor: theme.palette.onSurface,
			color: theme.palette.surface,
			fontFamily: theme.font.fontFamily,
		});
	};

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
	container.appendChild(wrapper);

	return {
		update: (nextProps: ImageSwitchButtonProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			teardown.run();
			wrapper.parentNode?.removeChild(wrapper);
		},
	};
};
