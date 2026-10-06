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
	/** Accessible name, and the tooltip's text. */
	label: string;
	/**
	 * Shows the tooltip without a hover, and draws the button on the primary
	 * colour, for a user who looks to be struggling.
	 */
	tooltipPinned?: boolean;
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

const buttonStyle: StyleMap = {
	border: "none",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "50%",
	padding: "4px",
	height: "24px",
	width: "24px",
	transition: "background-color 0.25s",
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

	const button = createControl(teardown, {
		className: randomToken(),
		attributes: {
			"aria-label": props.label,
			"data-cy": isDevMode() ? "image-switch-button" : undefined,
		},
		children: [svg],
		onActivate: (event: MouseEvent | KeyboardEvent) => {
			event.preventDefault();
			props.onSwitch();
		},
	});

	// Hover alone cannot explain an icon: there is no hover on a touch screen.
	// That is what pinning the tooltip is for.
	const tooltipArrow = createElement("span", {
		style: {
			position: "absolute",
			top: "-4px",
			left: "12px",
			width: "8px",
			height: "8px",
			transform: "rotate(45deg)",
		},
	});
	const tooltipText = createElement("span");
	const tooltip = createElement("span", {
		attributes: { role: "tooltip", "aria-hidden": "true" },
		style: {
			position: "absolute",
			top: "calc(100% + 8px)",
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
		children: [tooltipArrow, tooltipText],
	});

	const wrapper = createElement("div", {
		style: { position: "relative", display: "inline-flex" },
		children: [button, tooltip],
	});

	const render = () => {
		const theme = themeFor(props.themeColor);
		const pinned = true === props.tooltipPinned;
		button.setAttribute("aria-label", props.label);
		const fill = pinned
			? theme.palette.primary.contrastText
			: theme.palette.primaryContainer.contrastText;
		for (const cell of cells) {
			cell.setAttribute("fill", fill);
		}
		applyStyles(button, {
			...buttonStyle,
			outline: focusVisible
				? `3px solid ${theme.palette.primary.main}`
				: "none",
			outlineOffset: focusVisible ? "2px" : undefined,
			backgroundColor: pinned
				? theme.palette.primary.main
				: hover
					? theme.palette.primaryContainer.hover
					: theme.palette.primaryContainer.main,
		});
		tooltipText.textContent = props.label;
		applyStyles(tooltip, {
			display: pinned || hover || focusVisible ? "block" : "none",
			backgroundColor: theme.palette.onSurface,
			color: theme.palette.surface,
			fontFamily: theme.font.fontFamily,
		});
		applyStyles(tooltipArrow, { backgroundColor: theme.palette.onSurface });
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
