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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import type { Component } from "../dom/component.js";
import { Teardown } from "../dom/component.js";
import {
	type StyleMap,
	applyStyles,
	createElement,
	createSvgElement,
} from "../dom/element.js";

export interface ReloadButtonProps {
	themeColor: "light" | "dark";
	onReload: () => void;
}

const RELOAD_PATH =
	"M234.666667,149.333333 L234.666667,106.666667 L314.564847,106.664112 C287.579138,67.9778918 242.745446,42.6666667 192,42.6666667 C109.525477,42.6666667 42.6666667,109.525477 42.6666667,192 C42.6666667,274.474523 109.525477,341.333333 192,341.333333 C268.201293,341.333333 331.072074,284.258623 340.195444,210.526102 L382.537159,215.817985 C370.807686,310.617565 289.973536,384 192,384 C85.961328,384 1.42108547e-14,298.038672 1.42108547e-14,192 C1.42108547e-14,85.961328 85.961328,1.42108547e-14 192,1.42108547e-14 C252.316171,1.42108547e-14 306.136355,27.8126321 341.335366,71.3127128 L341.333333,1.42108547e-14 L384,1.42108547e-14 L384,149.333333 L234.666667,149.333333 Z";

const buttonStyleBase: StyleMap = {
	border: "none",
	paddingTop: "6px",
	paddingBottom: "6px",
	cursor: "pointer",
	height: "39px",
	width: "39px",
	borderRadius: "50%",
	display: "flex",
};

export const mountReloadButton = (
	container: HTMLElement,
	initialProps: ReloadButtonProps,
): Component<ReloadButtonProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let hover = false;

	const themeFor = (themeColor: "light" | "dark") =>
		"light" === themeColor ? lightTheme : darkTheme;

	const path = createSvgElement("path", {
		attributes: {
			"shape-rendering": "optimizeQuality",
			transform: "scale(0.0416)",
			d: RELOAD_PATH,
		},
	});

	const title = createSvgElement("title");
	title.textContent = "reload";

	const svg = createSvgElement("svg", {
		attributes: {
			width: "16px",
			height: "16px",
			viewBox: "0 0 16 16",
			version: "1.1",
		},
		style: { display: "flex" },
		children: [title, path],
	});

	const button = createElement("button", {
		className: "reload-button",
		attributes: { "aria-label": "Reload", type: "button" },
		children: [svg],
	});

	const render = () => {
		const theme = themeFor(props.themeColor);
		applyStyles(button, {
			...buttonStyleBase,
			color: hover
				? theme.palette.primary.contrastText
				: theme.palette.background.contrastText,
			border: `1px solid ${theme.palette.grey[500]}`,
			borderRadius: "50%",
			transition: "background-color 0.3s",
			boxShadow: `0px 1px 3px 0px ${theme.palette.grey[500]}`,
			justifyContent: "center",
			alignItems: "center",
			margin: "0 auto",
			backgroundColor: hover
				? theme.palette.grey[700]
				: theme.palette.background.default,
		});
		path.setAttribute(
			"fill",
			hover ? theme.palette.primary.contrastText : theme.palette.grey[700],
		);
	};

	teardown.addEventListener(button, "mouseenter", () => {
		hover = true;
		render();
	});
	teardown.addEventListener(button, "mouseleave", () => {
		hover = false;
		render();
	});
	teardown.addEventListener(button, "click", (event: Event) => {
		event.preventDefault();
		props.onReload();
	});

	render();
	container.appendChild(button);

	return {
		update: (nextProps: ReloadButtonProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			teardown.run();
			button.parentNode?.removeChild(button);
		},
	};
};
