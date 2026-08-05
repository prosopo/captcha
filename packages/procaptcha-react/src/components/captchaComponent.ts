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
import type { Translator } from "@prosopo/locale";
import {
	type Component,
	type StyleMap,
	applyAttributes,
	applyStyles,
	createElement,
	mountReloadButton,
} from "@prosopo/procaptcha-common";
import type { CaptchaResponseBody } from "@prosopo/types";
import { at } from "@prosopo/util";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import addDataAttr from "../util/index.js";
import { mountButton } from "./button.js";
import { mountCaptchaWidget } from "./captchaWidget.js";

export interface CaptchaComponentProps {
	challenge: CaptchaResponseBody;
	index: number;
	solutions: [string, number, number][][];
	onSubmit: () => void;
	onCancel: () => void;
	onClick: (hash: string, x?: number, y?: number) => void;
	onNext: () => void;
	onReload: () => void;
	themeColor: "light" | "dark";
	translator: Translator;
}

const outerStyle = (backgroundColor: string): StyleMap => ({
	// introduce scroll bars when screen < minWidth of children
	overflowX: "auto",
	overflowY: "auto",
	maxWidth: "500px",
	maxHeight: "100%",
	display: "flex",
	flexDirection: "column",
	border: "1px solid #dddddd",
	boxShadow: "rgba(255, 255, 255, 0.2) 0px 0px 4px",
	borderRadius: "4px",
	backgroundColor,
	userSelect: "none",
	touchAction: "none",
	overscrollBehavior: "none",
});

const columnStyle: StyleMap = {
	position: "relative",
	flexGrow: 1,
	// make the width of each item 1/3rd of the width overall, i.e. 3 columns
	flexBasis: "calc(33.333% - 10px)",
};

export const mountCaptchaComponent = (
	container: HTMLElement,
	initialProps: CaptchaComponentProps,
): Component<CaptchaComponentProps> => {
	let props = initialProps;

	const themeOf = (themeColor: "light" | "dark") =>
		"light" === themeColor ? lightTheme : darkTheme;

	// `noWrap`, so an out-of-range round throws rather than wrapping round to a
	// different one: the manager only renders a round it has both a captcha and
	// a solution slot for, so anything else is a bug worth surfacing rather
	// than silently showing the user the wrong images.
	const currentCaptcha = () =>
		at(props.challenge.captchas, props.index, { noWrap: true });
	const currentSolution = () =>
		at(props.solutions, props.index, { noWrap: true });

	const isLastRound = () => props.index >= props.challenge.captchas.length - 1;

	const theme = themeOf(props.themeColor);
	const doubleSpacing = `${theme.spacing.unit * 2}px`;
	const fullSpacing = `${theme.spacing.unit}px`;

	const targetLabel = createElement("span");

	const promptText = createElement("p", {
		style: { color: "#ffffff", fontWeight: 700, lineHeight: 1.5 },
	});

	const hintText = createElement("p", {
		style: {
			color: "#ffffff",
			fontWeight: 500,
			lineHeight: 0.8,
			fontSize: "0.8rem",
		},
	});

	const header = createElement("div", {
		style: {
			padding: `${theme.spacing.half}px`,
			fontFamily: theme.font.fontFamily,
		},
		children: [promptText, hintText],
	});

	const headerBar = createElement("div", {
		style: {
			backgroundColor: theme.palette.primary.main,
			width: "100%",
			marginTop: fullSpacing,
		},
		children: [header],
	});

	const headerRow = createElement("div", {
		style: { display: "flex", alignItems: "center", width: "100%" },
		children: [headerBar],
	});

	const gridHost = createElement("div", {
		style: { overflow: "hidden" },
		attributes: addDataAttr({ dev: { cy: `captcha-${props.index}` } }),
	});

	const cancelHost = createElement("div", { style: columnStyle });
	const reloadHost = createElement("div", { style: columnStyle });
	const nextHost = createElement("div", { style: columnStyle });

	const controls = createElement("div", {
		style: {
			// expand to full height / width of parent
			width: "100%",
			height: "100%",
			// display children in flex, spreading them evenly
			display: "flex",
			flexDirection: "row",
			justifyContent: "space-between",
			gap: "10px",
		},
		children: [cancelHost, reloadHost, nextHost],
	});

	const controlsRow = createElement("div", {
		style: {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			lineHeight: 1.75,
			padding: `${fullSpacing} 0 ${doubleSpacing} 0`,
		},
		children: [controls],
	});

	const inner = createElement("div", {
		style: {
			backgroundColor: theme.palette.background.default,
			display: "flex",
			flexDirection: "column",
			minWidth: "300px",
			marginLeft: fullSpacing,
			marginRight: fullSpacing,
			justifyContent: "center",
		},
		children: [headerRow, gridHost, controlsRow],
	});

	const root = createElement("div", {
		style: outerStyle(theme.palette.background.default),
		children: [inner],
	});

	const grid = mountCaptchaWidget(gridHost, {
		challenge: currentCaptcha(),
		solution: currentSolution(),
		onClick: props.onClick,
		themeColor: props.themeColor,
	});

	const cancelButton = mountButton(cancelHost, {
		themeColor: props.themeColor,
		buttonType: "cancel",
		onClick: () => props.onCancel(),
		text: props.translator.t("WIDGET.CANCEL"),
	});

	const reloadButton = mountReloadButton(reloadHost, {
		themeColor: props.themeColor,
		onReload: () => props.onReload(),
	});

	const nextButton = mountButton(nextHost, {
		themeColor: props.themeColor,
		buttonType: "next",
		onClick: () => (isLastRound() ? props.onSubmit() : props.onNext()),
		text: props.translator.t("WIDGET.SUBMIT"),
	});

	const render = () => {
		const activeTheme = themeOf(props.themeColor);
		applyStyles(root, outerStyle(activeTheme.palette.background.default));
		applyStyles(inner, {
			backgroundColor: activeTheme.palette.background.default,
		});
		applyStyles(headerBar, {
			backgroundColor: activeTheme.palette.primary.main,
		});
		applyStyles(header, { fontFamily: activeTheme.font.fontFamily });

		const t = props.translator.t;
		targetLabel.textContent = `${currentCaptcha().target} `;
		// `:` then a non-breaking space, matching the `&nbsp;` the JSX carried
		// between the label and the target word.
		promptText.textContent = `${t("WIDGET.SELECT_ALL")}:\u00a0`;
		promptText.appendChild(targetLabel);
		hintText.textContent = t("WIDGET.IF_NONE_CLICK_NEXT");

		applyAttributes(
			gridHost,
			addDataAttr({ dev: { cy: `captcha-${props.index}` } }),
		);

		grid.update({
			challenge: currentCaptcha(),
			solution: currentSolution(),
			onClick: props.onClick,
			themeColor: props.themeColor,
		});

		cancelButton.update({
			themeColor: props.themeColor,
			buttonType: "cancel",
			onClick: () => props.onCancel(),
			text: t("WIDGET.CANCEL"),
		});

		reloadButton.update({
			themeColor: props.themeColor,
			onReload: () => props.onReload(),
		});

		nextButton.update({
			themeColor: props.themeColor,
			buttonType: "next",
			onClick: () => (isLastRound() ? props.onSubmit() : props.onNext()),
			text: isLastRound() ? t("WIDGET.SUBMIT") : t("WIDGET.NEXT"),
		});
	};

	render();
	container.appendChild(root);

	return {
		update: (nextProps: CaptchaComponentProps) => {
			props = nextProps;
			render();
		},
		destroy: () => {
			grid.destroy();
			cancelButton.destroy();
			reloadButton.destroy();
			nextButton.destroy();
			root.parentNode?.removeChild(root);
		},
	};
};
