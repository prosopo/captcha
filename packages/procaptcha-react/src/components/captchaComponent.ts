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
	threeColumnBasis,
	wrapRandomly,
} from "@prosopo/procaptcha-common";
import type { CaptchaResponseBody } from "@prosopo/types";
import { at } from "@prosopo/util";
import {
	type Theme,
	darkTheme,
	lightTheme,
	randomInt,
} from "@prosopo/widget-skeleton";
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

const outerStyle = (theme: Theme): StyleMap => ({
	// introduce scroll bars when screen < minWidth of children
	overflowX: "auto",
	overflowY: "auto",
	maxWidth: "500px",
	maxHeight: "100%",
	display: "flex",
	flexDirection: "column",
	border: `1px solid ${theme.palette.border}`,
	boxShadow: theme.elevation.card,
	borderRadius: theme.shape.card,
	backgroundColor: theme.palette.background.default,
	userSelect: "none",
	// `pan-y`, not `none`. This panel is `overflow-y: auto`, so on a phone it
	// is the thing the finger has to drag when the images do not fit — and
	// `touch-action: none` tells the browser not to pan it at all, which left
	// the bottom row unreachable rather than merely off-screen. Stopping the
	// page behind from scrolling is `overscroll-behavior`'s job, below, and it
	// still does it; what `none` added on top of that was blocking the one
	// gesture the panel needs. Pinch-zoom stays blocked either way.
	touchAction: "pan-y",
	overscrollBehavior: "none",
});

// M3 "title medium" for the instruction, "body medium" for the supporting line
// — the type scale carries the hierarchy rather than ad-hoc weights.
const promptStyle = (theme: Theme): StyleMap => ({
	...theme.typography.titleMedium,
	color: theme.palette.primaryContainer.contrastText,
	margin: 0,
});

const hintStyle = (theme: Theme): StyleMap => ({
	...theme.typography.bodyMedium,
	// De-emphasis via the onSurfaceVariant role, not opacity.
	color: theme.palette.onSurfaceVariant,
	margin: "4px 0 0 0",
});

const targetStyle = (theme: Theme): StyleMap => ({
	color: theme.palette.titleAccent,
	fontWeight: 700,
});

const columnStyle = (gap: number): StyleMap => ({
	position: "relative",
	flexGrow: 1,
	// make the width of each item 1/3rd of the width overall, i.e. 3 columns
	flexBasis: threeColumnBasis(gap),
});

// Padding and spacing are nudged per mount, so a solver cannot write down where
// in the dialog the controls and the tiles land. Every one of these changes the
// panel's own size rather than moving it, so the surface still centres it and a
// panel taller than the viewport still scrolls to its own edges.
const SPACING_JITTER = 4;
const MIN_CONTROL_GAP = 6;
const MAX_CONTROL_GAP = 14;
const HEADER_PADDING_Y = 12;
const HEADER_PADDING_X = 14;
const HEADER_PADDING_JITTER = 3;

const MIN_WRAPPER_DEPTH = 0;
const MAX_WRAPPER_DEPTH = 2;

const decoy = (element: HTMLElement): HTMLElement =>
	wrapRandomly(element, MIN_WRAPPER_DEPTH, MAX_WRAPPER_DEPTH);

/** A spacing token moved by a few pixels, never below zero. */
const jittered = (base: number, jitter: number = SPACING_JITTER): number =>
	Math.max(0, base + randomInt(-jitter, jitter));

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
	const controlGap = randomInt(MIN_CONTROL_GAP, MAX_CONTROL_GAP);
	const column = columnStyle(controlGap);

	const targetLabel = createElement("span", { style: targetStyle(theme) });

	const promptText = createElement("p", {
		style: promptStyle(theme),
		attributes: addDataAttr({ dev: { cy: "captcha-prompt" } }),
	});

	const hintText = createElement("p", { style: hintStyle(theme) });

	const header = createElement("div", {
		style: {
			padding: `${jittered(HEADER_PADDING_Y, HEADER_PADDING_JITTER)}px ${jittered(HEADER_PADDING_X, HEADER_PADDING_JITTER)}px`,
			fontFamily: theme.font.fontFamily,
		},
		children: [decoy(promptText), decoy(hintText)],
	});

	const headerBar = createElement("div", {
		style: {
			backgroundColor: theme.palette.primaryContainer.main,
			borderRadius: theme.shape.header,
			width: "100%",
			marginTop: `${jittered(theme.spacing.unit)}px`,
		},
		children: [decoy(header)],
	});

	const headerRow = createElement("div", {
		style: { display: "flex", alignItems: "center", width: "100%" },
		children: [decoy(headerBar)],
	});

	const gridHost = createElement("div", {
		style: { overflow: "hidden" },
		attributes: addDataAttr({ dev: { cy: `captcha-${props.index}` } }),
	});

	const cancelHost = createElement("div", { style: column });
	const reloadHost = createElement("div", { style: column });
	const nextHost = createElement("div", { style: column });

	const controls = createElement("div", {
		style: {
			// expand to full height / width of parent
			width: "100%",
			height: "100%",
			// display children in flex, spreading them evenly
			display: "flex",
			flexDirection: "row",
			justifyContent: "space-between",
			gap: `${controlGap}px`,
		},
		children: [decoy(cancelHost), decoy(reloadHost), decoy(nextHost)],
	});

	const controlsRow = createElement("div", {
		style: {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			lineHeight: 1.75,
			padding: `${jittered(theme.spacing.unit)}px 0 ${jittered(theme.spacing.unit * 2)}px 0`,
		},
		children: [decoy(controls)],
	});

	const inner = createElement("div", {
		style: {
			backgroundColor: theme.palette.background.default,
			display: "flex",
			flexDirection: "column",
			minWidth: "300px",
			marginLeft: `${jittered(theme.spacing.unit)}px`,
			marginRight: `${jittered(theme.spacing.unit)}px`,
			justifyContent: "center",
		},
		children: [decoy(headerRow), decoy(gridHost), decoy(controlsRow)],
	});

	const root = createElement("div", {
		style: outerStyle(theme),
		attributes: addDataAttr({ dev: { cy: "captcha-panel" } }),
		children: [decoy(inner)],
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
		applyStyles(root, outerStyle(activeTheme));
		applyStyles(inner, {
			backgroundColor: activeTheme.palette.background.default,
		});
		applyStyles(headerBar, {
			backgroundColor: activeTheme.palette.primaryContainer.main,
			borderRadius: activeTheme.shape.header,
		});
		applyStyles(header, { fontFamily: activeTheme.font.fontFamily });
		applyStyles(promptText, promptStyle(activeTheme));
		applyStyles(hintText, hintStyle(activeTheme));
		applyStyles(targetLabel, targetStyle(activeTheme));

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
