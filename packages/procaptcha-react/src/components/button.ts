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
	type Component,
	type StyleMap,
	Teardown,
	applyAttributes,
	applyStyles,
	createElement,
} from "@prosopo/procaptcha-common";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import addDataAttr from "../util/index.js";

export interface ButtonProps {
	themeColor: "light" | "dark";
	buttonType: "cancel" | "next";
	onClick: () => void;
	text: string;
}

const buttonStyleBase: StyleMap = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	position: "relative",
	boxSizing: "border-box",
	outline: "0px",
	margin: "0px",
	cursor: "pointer",
	userSelect: "none",
	verticalAlign: "middle",
	textDecoration: "none",
	fontWeight: "500",
	fontSize: "0.875rem",
	lineHeight: "1.75",
	letterSpacing: "0.02857em",
	textTransform: "uppercase",
	minWidth: "64px",
	padding: "6px 16px",
	borderRadius: "4px",
	transition:
		"background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
	backgroundColor: "#ffffff",
};

export const mountButton = (
	container: HTMLElement,
	initialProps: ButtonProps,
): Component<ButtonProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let hover = false;

	const button = createElement("button");

	const render = () => {
		const theme = "light" === props.themeColor ? lightTheme : darkTheme;
		const backgroundColor =
			"cancel" === props.buttonType
				? hover
					? theme.palette.grey[600]
					: "transparent"
				: hover
					? theme.palette.primary.main
					: theme.palette.background.default;

		applyStyles(button, {
			...buttonStyleBase,
			border: `1px solid ${theme.palette.grey[500]}`,
			boxShadow: `0px 1px 3px 0px ${theme.palette.grey[500]}`,
			fontFamily: theme.font.fontFamily,
			width: "100%",
			color: hover
				? theme.palette.primary.contrastText
				: theme.palette.background.contrastText,
			backgroundColor,
		});

		applyAttributes(button, {
			...addDataAttr({ dev: { cy: `button-${props.buttonType}` } }),
			"aria-label": props.text,
		});
		button.textContent = props.text;
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
		if (!event.isTrusted) {
			return;
		}
		event.preventDefault();
		props.onClick();
	});

	render();
	container.appendChild(button);

	return {
		update: (nextProps: ButtonProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			teardown.run();
			button.parentNode?.removeChild(button);
		},
	};
};
