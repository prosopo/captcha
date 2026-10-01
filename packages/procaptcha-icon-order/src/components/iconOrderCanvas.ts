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

import type { TranslationKey, Translator } from "@prosopo/locale";
import {
	type AudioAlternativeFooterProps,
	type AudioAlternativeOffer,
	type ChallengeSurfaceComponent,
	type ChallengeSurfaceProps,
	type Component,
	Teardown,
	applyAttributes,
	applyStyles,
	createElement,
	mountAudioAlternativeFooter,
	mountChallengeSurface,
} from "@prosopo/procaptcha-common";
import type { IconClick, IconOrderEvent, PlacementType } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";

export interface IconOrderCanvasProps {
	/** Data URI of the frame, with every icon already composited in. */
	background: string;
	/** Data URI of the legend strip, icons in the order to select them. */
	legend: string;
	/** Edge length of one legend icon, in px. */
	legendIconSize: number;
	onComplete: (clicks: IconClick[], events: IconOrderEvent[]) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	translator: Translator;
	placement?: PlacementType;
	anchor?: HTMLElement | null;
	onDismiss?: () => void;
	/** Renders "use audio instead" below the controls. Absent hides it. */
	audioAlternative?: AudioAlternativeOffer;
}

/**
 * Must match `DEFAULT_GEOMETRY` in @prosopo/icon-order-assets: the provider
 * grades clicks in this coordinate space.
 */
const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

const MARKER_RADIUS = 13;
const SHAKE_MS = 500;
/** `MouseEvent.button` for a primary click, a touch or a pen contact. */
const MAIN_BUTTON = 0;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-icon-order-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

export const mountIconOrderCanvas = (
	initialProps: IconOrderCanvasProps,
): Component<IconOrderCanvasProps> => {
	const teardown = new Teardown();
	let props = initialProps;

	let clicks: IconClick[] = [];
	let events: IconOrderEvent[] = [];
	let startedAt = Date.now();
	let visible = false;
	let shaking = false;
	let shakeTimer: ReturnType<typeof setTimeout> | undefined;
	const markers: HTMLDivElement[] = [];

	const t = (key: TranslationKey, options?: Record<string, unknown>): string =>
		props.translator.t(key, options);

	const style = createElement("style", { text: SHAKE_KEYFRAMES });

	const instruction = createElement("span");

	const legend = createElement("img", {
		style: { imageRendering: "auto", userSelect: "none" },
		attributes: { draggable: "false" },
	});

	const header = createElement("div", {
		style: {
			borderRadius: "20px 20px 0 0",
			padding: "10px 16px",
			width: `${CONTAINER_WIDTH}px`,
			boxSizing: "border-box",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "10px",
			fontSize: "14px",
			fontWeight: 500,
			transition: "color 0.3s ease, border-color 0.3s ease",
		},
		children: [instruction, legend],
	});

	const background = createElement("img", {
		style: {
			position: "absolute",
			inset: 0,
			width: `${CONTAINER_WIDTH}px`,
			height: `${CONTAINER_HEIGHT}px`,
			pointerEvents: "none",
			userSelect: "none",
		},
		attributes: { alt: "", draggable: "false" },
	});

	const frame = createElement("div", {
		style: {
			position: "relative",
			width: `${CONTAINER_WIDTH}px`,
			height: `${CONTAINER_HEIGHT}px`,
			overflow: "hidden",
			userSelect: "none",
			touchAction: "none",
			transition: "opacity 0.2s ease",
		},
		children: [background],
	});

	const resetButton = createElement("button", {
		attributes: { type: "button" },
		style: {
			flex: "0 0 auto",
			padding: "8px 12px",
			borderRadius: "10px",
			background: "transparent",
			fontSize: "13px",
		},
	});

	const submitButton = createElement("button", {
		attributes: { type: "button" },
		style: {
			flex: "1 1 auto",
			padding: "8px 12px",
			borderRadius: "10px",
			border: "none",
			fontSize: "14px",
			fontWeight: 600,
		},
	});

	// Kept out of production builds: a stable selector on the interactive
	// surface is exactly what a scripted solver wants.
	if ("production" !== process.env.NODE_ENV) {
		applyAttributes(frame, { "data-cy": "prosopo-icon-order-frame" });
		applyAttributes(resetButton, { "data-cy": "prosopo-icon-order-reset" });
		applyAttributes(submitButton, { "data-cy": "prosopo-icon-order-submit" });
	}

	const controls = createElement("div", {
		style: {
			borderRadius: "0 0 20px 20px",
			padding: "10px 16px",
			width: `${CONTAINER_WIDTH}px`,
			boxSizing: "border-box",
			display: "flex",
			alignItems: "center",
			gap: "10px",
		},
		children: [resetButton, submitButton],
	});

	const panel = createElement("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			transition: "opacity 0.3s ease, transform 0.3s ease",
		},
		children: [header, frame, controls],
	});

	const surfaceProps = (): ChallengeSurfaceProps => ({
		show: true,
		placement: props.placement,
		anchor: props.anchor,
		onDismiss: props.onDismiss,
		scrim: visible ? "dim" : "none",
		dialogLabel: t("WIDGET.ICON_ORDER.DIALOG_LABEL", {
			defaultValue: "Icon order challenge",
		}),
	});

	const surface: ChallengeSurfaceComponent = mountChallengeSurface(
		surfaceProps(),
	);
	surface.content.append(style, panel);

	const audioAlternativeFooterProps = (): AudioAlternativeFooterProps => ({
		offer: props.audioAlternative,
		theme: props.theme,
		width: CONTAINER_WIDTH,
	});
	const audioAlternativeFooter = mountAudioAlternativeFooter(
		panel,
		audioAlternativeFooterProps(),
	);

	const createMarker = (): HTMLDivElement =>
		createElement("div", {
			style: {
				position: "absolute",
				width: `${MARKER_RADIUS * 2}px`,
				height: `${MARKER_RADIUS * 2}px`,
				borderRadius: "50%",
				border: "2px solid rgba(255, 255, 255, 0.9)",
				boxShadow: "0 2px 6px rgba(0, 0, 0, 0.45)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "12px",
				fontWeight: 700,
				pointerEvents: "none",
				userSelect: "none",
			},
		});

	const renderMarkers = () => {
		while (markers.length > clicks.length) {
			markers.pop()?.remove();
		}
		while (markers.length < clicks.length) {
			const marker = createMarker();
			frame.appendChild(marker);
			markers.push(marker);
		}
		const { theme } = props;
		clicks.forEach((click: IconClick, index: number) => {
			const marker = markers[index];
			if (!marker) {
				return;
			}
			marker.textContent = String(index + 1);
			applyStyles(marker, {
				left: `${click.x - MARKER_RADIUS}px`,
				top: `${click.y - MARKER_RADIUS}px`,
				backgroundColor: theme.palette.primary.main,
				color: theme.palette.background.default,
				fontFamily: theme.font.fontFamily,
			});
		});
	};

	const render = () => {
		const { theme, showRetry, submitting } = props;
		const empty = 0 === clicks.length;
		const inactive = submitting || empty;

		applyStyles(panel, {
			opacity: visible ? 1 : 0,
			transform: visible ? "scale(1)" : "scale(0.9)",
			animation: shaking
				? `prosopo-icon-order-shake ${SHAKE_MS}ms ease`
				: "none",
		});

		instruction.textContent = showRetry
			? t("WIDGET.ICON_ORDER.RETRY", { defaultValue: "Not quite — try again" })
			: t("WIDGET.ICON_ORDER.SELECT", {
					defaultValue: "Select in this order",
				});
		applyStyles(header, {
			backgroundColor: theme.palette.surface,
			fontFamily: theme.font.fontFamily,
			color: showRetry ? theme.palette.error.main : theme.palette.onSurface,
			borderBottom: `2px solid ${
				showRetry ? theme.palette.error.main : "transparent"
			}`,
		});

		legend.src = props.legend;
		legend.alt = t("WIDGET.ICON_ORDER.LEGEND_ALT", {
			defaultValue: "Icons to select, in order",
		});
		applyStyles(legend, { height: `${props.legendIconSize}px` });

		background.src = props.background;
		applyStyles(frame, {
			// Tonal fallback shown before the server-rendered frame loads.
			background: `linear-gradient(135deg, ${theme.palette.surface} 0%, ${theme.palette.primaryContainer.main} 50%, ${theme.palette.surface} 100%)`,
			cursor: submitting ? "default" : "pointer",
			opacity: submitting ? 0.6 : 1,
			pointerEvents: submitting ? "none" : "auto",
		});
		renderMarkers();

		applyStyles(controls, {
			backgroundColor: theme.palette.surface,
			borderRadius: props.audioAlternative ? "0" : "0 0 20px 20px",
		});
		audioAlternativeFooter.update(audioAlternativeFooterProps());

		resetButton.textContent = t("WIDGET.ICON_ORDER.RESET", {
			defaultValue: "Reset",
		});
		resetButton.disabled = inactive;
		applyStyles(resetButton, {
			border: `1px solid ${theme.palette.border}`,
			color: theme.palette.onSurface,
			fontFamily: theme.font.fontFamily,
			cursor: inactive ? "default" : "pointer",
			opacity: inactive ? 0.5 : 1,
		});

		submitButton.textContent = submitting
			? t("WIDGET.ICON_ORDER.CHECKING", { defaultValue: "Checking…" })
			: t("WIDGET.ICON_ORDER.SUBMIT", { defaultValue: "OK" });
		submitButton.disabled = inactive;
		applyStyles(submitButton, {
			backgroundColor: theme.palette.primary.main,
			color: theme.palette.background.default,
			fontFamily: theme.font.fontFamily,
			cursor: inactive ? "default" : "pointer",
			opacity: inactive ? 0.5 : 1,
		});

		surface.update(surfaceProps());
	};

	const clearAnswer = () => {
		clicks = [];
		events = [];
		startedAt = Date.now();
	};

	/**
	 * Scales by the frame's measured box rather than the constants, so a host
	 * page that transforms the widget still reports clicks in the provider's
	 * coordinate space.
	 */
	const toFramePoint = (event: Event): IconClick | null => {
		if (props.submitting || !(event instanceof MouseEvent)) {
			return null;
		}
		const rect = frame.getBoundingClientRect();
		if (0 === rect.width || 0 === rect.height) {
			return null;
		}
		return {
			x: ((event.clientX - rect.left) / rect.width) * CONTAINER_WIDTH,
			y: ((event.clientY - rect.top) / rect.height) * CONTAINER_HEIGHT,
		};
	};

	const recordEvent = (point: IconClick) => {
		events.push({ x: point.x, y: point.y, t: Date.now() - startedAt });
	};

	teardown.addEventListener(frame, "pointermove", (event: Event) => {
		const point = toFramePoint(event);
		if (point) {
			recordEvent(point);
		}
	});

	// Only pointer events: a click or touchend listener as well would count
	// each tap twice, since browsers synthesise a click after touchend even
	// under `touch-action: none`.
	teardown.addEventListener(frame, "pointerup", (event: Event) => {
		if (event instanceof MouseEvent && MAIN_BUTTON !== event.button) {
			return;
		}
		const point = toFramePoint(event);
		if (!point) {
			return;
		}
		recordEvent(point);
		clicks = [...clicks, point];
		render();
	});

	teardown.addEventListener(resetButton, "click", () => {
		clearAnswer();
		render();
	});

	teardown.addEventListener(submitButton, "click", () => {
		if (props.submitting || 0 === clicks.length) {
			return;
		}
		props.onComplete([...clicks], [...events]);
	});

	render();

	// After the first paint, so the entrance transition runs.
	const frameRequest = requestAnimationFrame(() => {
		visible = true;
		render();
	});
	teardown.add(() => cancelAnimationFrame(frameRequest));

	const startShake = () => {
		shaking = true;
		render();
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
		shakeTimer = setTimeout(() => {
			shaking = false;
			render();
		}, SHAKE_MS);
	};

	teardown.add(() => {
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
	});

	if (props.showRetry) {
		startShake();
	}

	return {
		update: (nextProps: IconOrderCanvasProps) => {
			const previous = props;
			props = nextProps;

			// New imagery is a new challenge, which the old clicks don't answer.
			if (
				nextProps.background !== previous.background ||
				nextProps.legend !== previous.legend
			) {
				clearAnswer();
			}

			if (nextProps.showRetry && !previous.showRetry) {
				startShake();
				return;
			}

			render();
		},
		destroy: () => {
			teardown.run();
			audioAlternativeFooter.destroy();
			surface.destroy();
		},
	};
};
