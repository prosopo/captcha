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
	type ChallengeSurfaceComponent,
	type Component,
	type StyleMap,
	Teardown,
	applyAttributes,
	applyStyles,
	createElement,
	isEventTrusted,
	mountChallengeSurface,
} from "@prosopo/procaptcha-common";
import type { PlacementType, PuzzleEvent } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";

export interface PuzzleCanvasProps {
	originX: number;
	originY: number;
	/** Background with the notch already cut into it, as a data URI. */
	background: string;
	/** The draggable piece on transparency, as a data URI. */
	piece: string;
	/** Piece bounding-box size in px, as rendered by the provider. */
	pieceSize: number;
	onComplete: (
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
	) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	translator: Translator;
	placement?: PlacementType;
	anchor?: HTMLElement | null;
	onDismiss?: () => void;
}

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

const PIECE_CSS_CLASS = "prosopo-puzzle-piece";

// An arrow press moves a tenth of the board's width. The provider accepts a
// solution within 15px of the target, so a 10px lattice always contains a
// winning cell (worst case is half a diagonal, ~7.1px) — a keyboard user can
// land the piece without ever needing the finer step.
const STEP_PX = 10;
const FINE_STEP_PX = 2;

// Arrow keys repeat far faster than a screen reader speaks. Coalescing to the
// last position after a pause keeps the running commentary from queueing up
// behind the user and reporting somewhere they left several seconds ago.
const ANNOUNCE_DEBOUNCE_MS = 400;

const VISUALLY_HIDDEN: StyleMap = {
	position: "absolute",
	width: "1px",
	height: "1px",
	padding: 0,
	margin: "-1px",
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
	border: 0,
};

const stylesheet = (focusRingColor: string): string => `
@keyframes prosopo-puzzle-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.${PIECE_CSS_CLASS}:focus-visible {
	outline: 3px solid ${focusRingColor};
	outline-offset: 2px;
}
`;

// [column, row, scaleX, scaleY] — the centre tile plus the eight mirrored
// copies that surround it.
const KALEIDOSCOPE_TILES: readonly [number, number, number, number][] = [
	[0, 0, -1, -1],
	[1, 0, 1, -1],
	[2, 0, -1, -1],
	[0, 1, -1, 1],
	[1, 1, 1, 1],
	[2, 1, -1, 1],
	[0, 2, -1, -1],
	[1, 2, 1, -1],
	[2, 2, -1, -1],
];

const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value));

let instanceCount = 0;

export const mountPuzzleCanvas = (
	initialProps: PuzzleCanvasProps,
): Component<PuzzleCanvasProps> => {
	const teardown = new Teardown();
	let props = initialProps;

	let posX = props.originX;
	let posY = props.originY;
	let dragging = false;
	let puzzleEvents: PuzzleEvent[] = [];
	let dragOffset = { x: 0, y: 0 };
	let visible = false;
	let shaking = false;
	let shakeTimer: ReturnType<typeof setTimeout> | undefined;
	let announceTimer: ReturnType<typeof setTimeout> | undefined;
	// Set by the first arrow press of a keyboard run, so the run starts from a
	// clean trail exactly as a fresh mouse grab does.
	let keyboardDragging = false;

	const baseId = `prosopo-puzzle-${instanceCount++}`;
	const instructionId = `${baseId}-instruction`;
	const keyboardHintId = `${baseId}-keyboard-hint`;

	const t = (key: string, options?: Record<string, unknown>): string =>
		props.translator.t(key, options);

	const style = createElement("style", {
		text: stylesheet(props.theme.palette.primary.main),
	});

	// Progress the piece cannot show a screen reader: where it has got to, that
	// a solution is being checked, and that a failed go has been replaced by a
	// fresh puzzle. An `output` carries the implicit `status` role a live
	// region needs.
	const announcer = createElement("output", {
		style: VISUALLY_HIDDEN,
		attributes: { "aria-live": "polite", "aria-atomic": "true" },
	});

	const keyboardHint = createElement("div", {
		style: VISUALLY_HIDDEN,
		attributes: { id: keyboardHintId },
	});

	/*
	 * The background. The notch is cut into these pixels by the provider; the
	 * widget is never told where it is. The transform/filter below react only
	 * to piece displacement, so no target information leaks through them.
	 *
	 * The background is tiled as a 3×3 mirrored kaleidoscope so the parallax
	 * translate never reveals a blank margin — the surrounding 8 tiles are the
	 * same image mirrored on each axis, giving a seamless continuation in
	 * every direction.
	 */
	const backgroundTiles = KALEIDOSCOPE_TILES.map(([column, row, sx, sy]) =>
		createElement("img", {
			style: {
				position: "absolute",
				left: `${column * CONTAINER_WIDTH}px`,
				top: `${row * CONTAINER_HEIGHT}px`,
				width: `${CONTAINER_WIDTH}px`,
				height: `${CONTAINER_HEIGHT}px`,
				transform: `scale(${sx}, ${sy})`,
				pointerEvents: "none",
				userSelect: "none",
			},
			attributes: { alt: "", draggable: false },
		}),
	);

	const backgroundLayer = createElement("div", {
		style: {
			// Position the wrapper so the centre tile lands at (0, 0), i.e.
			// exactly where the untranslated background would sit.
			left: `-${CONTAINER_WIDTH}px`,
			top: `-${CONTAINER_HEIGHT}px`,
			position: "absolute",
			width: `${CONTAINER_WIDTH * 3}px`,
			height: `${CONTAINER_HEIGHT * 3}px`,
			pointerEvents: "none",
			userSelect: "none",
			transformOrigin: "center center",
			willChange: "transform, filter",
		},
		children: backgroundTiles,
	});

	/*
	 * `application` rather than `button`: in the browse mode NVDA and JAWS
	 * default to, arrow keys move the reading cursor through the page and never
	 * reach a button's key handler. `application` is the role that hands them
	 * straight to this element, which is what makes the drag reachable without
	 * a pointer at all.
	 *
	 * The role and class are a stable production selector, which the data-cy
	 * below is deliberately not. A scripted solver could already find this
	 * element — it is the only draggable thing on the surface — whereas without
	 * them a keyboard or screen-reader user cannot find it at all.
	 */
	const piece = createElement("div", {
		className: PIECE_CSS_CLASS,
		style: {
			position: "absolute",
			backgroundSize: "100% 100%",
			// Without this, a touch on a zoomed-in mobile viewport is claimed by
			// the browser as a pan gesture before our touchmove handler ever
			// runs, so the page scrolls instead of the piece moving.
			touchAction: "none",
		},
		attributes: {
			role: "application",
			"aria-describedby": `${instructionId} ${keyboardHintId}`,
		},
	});

	// Test-only selector: gated on NODE_ENV !== "production" so the bundler
	// constant-folds it out of production builds. Cypress builds the bundle
	// with NODE_ENV=development (.github/workflows/cypress.yml:110) so the
	// selector is present under test.
	if ("production" !== process.env.NODE_ENV) {
		applyAttributes(piece, { "data-cy": "prosopo-puzzle-piece" });
	}

	const area = createElement("div", {
		style: {
			position: "relative",
			width: `${CONTAINER_WIDTH}px`,
			height: `${CONTAINER_HEIGHT}px`,
			borderRadius: "0 0 20px 20px",
			overflow: "hidden",
			userSelect: "none",
			transition: "opacity 0.2s ease",
		},
		children: [backgroundLayer, piece],
	});

	const instruction = createElement("div", {
		attributes: { id: instructionId },
		style: {
			borderRadius: "20px 20px 0 0",
			padding: "12px 20px",
			width: `${CONTAINER_WIDTH}px`,
			boxSizing: "border-box",
			textAlign: "center",
			fontSize: "14px",
			fontWeight: 500,
			transition: "color 0.3s ease, border-color 0.3s ease",
		},
	});

	const panel = createElement("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: "0",
			transition: "opacity 0.3s ease, transform 0.3s ease",
		},
		children: [instruction, area],
	});

	const surfaceProps = () => ({
		show: true,
		placement: props.placement,
		anchor: props.anchor,
		onDismiss: props.onDismiss,
		scrim: visible ? ("dim" as const) : ("none" as const),
		dialogLabel: t("WIDGET.PUZZLE.DIALOG_LABEL", {
			defaultValue: "Puzzle challenge",
		}),
	});

	const surface: ChallengeSurfaceComponent = mountChallengeSurface(
		surfaceProps(),
	);
	surface.content.append(style, announcer, keyboardHint, panel);

	const announce = (message: string, delayMs = 0) => {
		if (undefined !== announceTimer) {
			clearTimeout(announceTimer);
			announceTimer = undefined;
		}
		if (0 === delayMs) {
			announcer.textContent = message;
			return;
		}
		announceTimer = setTimeout(() => {
			announcer.textContent = message;
		}, delayMs);
	};

	// Pixel coordinates mean nothing to someone who cannot see the board, and
	// the widget is never told where the target is, so proportions are the only
	// bearing it can honestly offer.
	const describePosition = (x: number, y: number): string =>
		t("WIDGET.PUZZLE.POSITION", {
			defaultValue: "{{x}} percent across, {{y}} percent down",
			x: Math.round((x / CONTAINER_WIDTH) * 100),
			y: Math.round((y / CONTAINER_HEIGHT) * 100),
		});

	// The piece position is written straight to the element rather than going
	// through a render pass: a pointermove would otherwise rebuild the whole
	// overlay for a two-pixel move.
	const applyPiecePosition = () => {
		applyStyles(piece, {
			left: `${posX - props.pieceSize / 2}px`,
			top: `${posY - props.pieceSize / 2}px`,
		});
	};

	const applyPieceChrome = () => {
		applyStyles(piece, {
			width: `${props.pieceSize}px`,
			height: `${props.pieceSize}px`,
			backgroundImage: `url(${props.piece})`,
			cursor: props.submitting ? "default" : dragging ? "grabbing" : "grab",
			filter: dragging
				? "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))"
				: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35))",
			transition: dragging
				? "none"
				: "filter 0.2s ease, left 0.3s ease, top 0.3s ease",
		});
	};

	/*
	 * Client-side reaction to drag motion. Purely visual — computed from the
	 * piece's displacement from its starting position, never from anything that
	 * could hint at the target (the widget does not know the target). The
	 * background translates a few pixels *opposite* the piece for a parallax
	 * feel, and shifts hue/saturation with drag distance for a subtle
	 * live-canvas effect. On release everything eases back via the CSS
	 * transition below.
	 */
	const PARALLAX_FACTOR = 0.08;

	const applyBackgroundMotion = () => {
		const deltaX = posX - props.originX;
		const deltaY = posY - props.originY;
		const dragDistance = Math.hypot(deltaX, deltaY);
		const translateX = dragging ? -deltaX * PARALLAX_FACTOR : 0;
		const translateY = dragging ? -deltaY * PARALLAX_FACTOR : 0;
		const scale = dragging ? 1.03 : 1;
		// Cap the filter influence so a long drag doesn't kaleidoscope the frame.
		const hueShift = dragging ? clamp(deltaX * 0.12, -18, 18) : 0;
		const satBoost = dragging ? 1 + Math.min(0.25, dragDistance * 0.0035) : 1;
		const brightness = dragging ? 1 - Math.min(0.06, dragDistance * 0.0008) : 1;

		applyStyles(backgroundLayer, {
			transform: `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) scale(${scale.toFixed(3)})`,
			filter: `hue-rotate(${hueShift.toFixed(2)}deg) saturate(${satBoost.toFixed(3)}) brightness(${brightness.toFixed(3)})`,
			transition: dragging
				? "none"
				: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), filter 0.35s ease",
		});
	};

	const render = () => {
		const { theme } = props;
		applyStyles(panel, {
			opacity: visible ? 1 : 0,
			transform: visible ? "scale(1)" : "scale(0.9)",
			animation: shaking ? "prosopo-puzzle-shake 0.5s ease" : "none",
		});
		instruction.textContent = props.showRetry
			? t("WIDGET.PUZZLE.RETRY", { defaultValue: "Not quite — try again" })
			: t("WIDGET.PUZZLE.DRAG", {
					defaultValue: "Drag the piece to the target",
				});
		keyboardHint.textContent = t("WIDGET.PUZZLE.KEYBOARD_HINT", {
			defaultValue:
				"Use the arrow keys to move the piece, holding shift for smaller steps. Press Enter to submit it, Home to put it back at the start, or Escape to cancel.",
		});
		applyStyles(instruction, {
			backgroundColor: theme.palette.surface,
			fontFamily: theme.font.fontFamily,
			color: props.showRetry
				? theme.palette.error.main
				: theme.palette.onSurface,
			borderBottom: `2px solid ${
				props.showRetry ? theme.palette.error.main : "transparent"
			}`,
		});
		applyStyles(area, {
			// Material 3 purple tonal fallback shown before the server-rendered
			// background image loads.
			background: `linear-gradient(135deg, ${theme.palette.surface} 0%, ${theme.palette.primaryContainer.main} 50%, ${theme.palette.surface} 100%)`,
			opacity: props.submitting ? 0.6 : 1,
			pointerEvents: props.submitting ? "none" : "auto",
		});
		for (const tile of backgroundTiles) {
			tile.src = props.background;
		}
		applyAttributes(piece, {
			tabindex: props.submitting ? -1 : 0,
			"aria-roledescription": t("WIDGET.PUZZLE.PIECE_ROLE", {
				defaultValue: "draggable puzzle piece",
			}),
			"aria-label": t("WIDGET.PUZZLE.PIECE_LABEL", {
				defaultValue: "Puzzle piece",
			}),
		});
		applyPiecePosition();
		applyPieceChrome();
		applyBackgroundMotion();
		// Last, so the surface hands focus to a piece that is already focusable
		// and already where the challenge put it.
		surface.update(surfaceProps());
	};

	const containerOffset = (): { x: number; y: number } => {
		const rect = area.getBoundingClientRect();
		return { x: rect.left, y: rect.top };
	};

	const complete = (finalX: number, finalY: number) => {
		props.onComplete(finalX, finalY, [...puzzleEvents]);
	};

	const handleMove = (clientX: number, clientY: number) => {
		if (!dragging) {
			return;
		}

		const offset = containerOffset();
		posX = clamp(clientX - offset.x - dragOffset.x, 0, CONTAINER_WIDTH);
		posY = clamp(clientY - offset.y - dragOffset.y, 0, CONTAINER_HEIGHT);
		applyPiecePosition();
		applyBackgroundMotion();

		puzzleEvents.push({ x: posX, y: posY, t: Date.now() });
	};

	const handleEnd = () => {
		if (!dragging) {
			return;
		}
		dragging = false;
		applyPieceChrome();
		applyBackgroundMotion();

		const lastEvent = puzzleEvents[puzzleEvents.length - 1];
		complete(
			lastEvent ? lastEvent.x : props.originX,
			lastEvent ? lastEvent.y : props.originY,
		);
	};

	const beginDrag = (clientX: number, clientY: number) => {
		if (props.submitting) {
			return;
		}
		dragging = true;
		keyboardDragging = false;
		puzzleEvents = [];
		const offset = containerOffset();
		dragOffset = { x: clientX - offset.x - posX, y: clientY - offset.y - posY };
		applyPieceChrome();
		applyBackgroundMotion();
	};

	const moveByKeyboard = (deltaX: number, deltaY: number) => {
		if (!keyboardDragging) {
			keyboardDragging = true;
			puzzleEvents = [];
		}

		posX = clamp(posX + deltaX, 0, CONTAINER_WIDTH);
		posY = clamp(posY + deltaY, 0, CONTAINER_HEIGHT);
		applyPiecePosition();

		puzzleEvents.push({ x: posX, y: posY, t: Date.now() });
		announce(describePosition(posX, posY), ANNOUNCE_DEBOUNCE_MS);
	};

	const keyboardMove = (
		key: string,
		step: number,
	): [number, number] | undefined => {
		switch (key) {
			case "ArrowLeft":
				return [-step, 0];
			case "ArrowRight":
				return [step, 0];
			case "ArrowUp":
				return [0, -step];
			case "ArrowDown":
				return [0, step];
			case "Home":
				return [props.originX - posX, props.originY - posY];
			default:
				return undefined;
		}
	};

	teardown.addEventListener(piece, "keydown", (event: Event) => {
		if (props.submitting || !isEventTrusted(event)) {
			return;
		}
		const keyboardEvent = event as KeyboardEvent;
		const step = keyboardEvent.shiftKey ? FINE_STEP_PX : STEP_PX;

		const move = keyboardMove(keyboardEvent.key, step);
		if (move) {
			keyboardEvent.preventDefault();
			moveByKeyboard(move[0], move[1]);
			return;
		}

		if ("Enter" === keyboardEvent.key || " " === keyboardEvent.key) {
			keyboardEvent.preventDefault();
			// Ends the run, so the next arrow press opens a clean trail just as
			// the next mouse grab would.
			keyboardDragging = false;
			complete(posX, posY);
		}
	});

	teardown.addEventListener(piece, "focus", () => {
		announce(describePosition(posX, posY));
	});

	teardown.addEventListener(piece, "mousedown", (event: Event) => {
		const mouseEvent = event as MouseEvent;
		beginDrag(mouseEvent.clientX, mouseEvent.clientY);
	});
	teardown.addEventListener(piece, "touchstart", (event: Event) => {
		const touch = (event as TouchEvent).touches[0];
		if (touch) {
			beginDrag(touch.clientX, touch.clientY);
		}
	});

	teardown.addEventListener(document, "mousemove", (event: Event) => {
		const mouseEvent = event as MouseEvent;
		handleMove(mouseEvent.clientX, mouseEvent.clientY);
	});
	teardown.addEventListener(document, "mouseup", handleEnd);
	teardown.addEventListener(document, "touchmove", (event: Event) => {
		const touch = (event as TouchEvent).touches[0];
		if (touch) {
			handleMove(touch.clientX, touch.clientY);
		}
	});
	teardown.addEventListener(document, "touchend", handleEnd);

	render();

	// Entrance animation, fired after the first paint so the transition runs.
	const frame = requestAnimationFrame(() => {
		visible = true;
		render();
	});
	teardown.add(() => cancelAnimationFrame(frame));

	const startShake = () => {
		shaking = true;
		render();
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
		shakeTimer = setTimeout(() => {
			shaking = false;
			render();
		}, 500);
	};

	teardown.add(() => {
		if (undefined !== shakeTimer) {
			clearTimeout(shakeTimer);
		}
		if (undefined !== announceTimer) {
			clearTimeout(announceTimer);
		}
	});

	const announceStatus = () => {
		if (props.submitting) {
			announce(
				t("WIDGET.PUZZLE.CHECKING", { defaultValue: "Checking your answer" }),
			);
			return;
		}
		if (props.showRetry) {
			announce(
				t("WIDGET.PUZZLE.RETRY_ANNOUNCEMENT", {
					defaultValue:
						"Not quite. A new puzzle has loaded and the piece is back at the start.",
				}),
			);
		}
	};

	announceStatus();

	if (props.showRetry) {
		startShake();
	}

	return {
		update: (nextProps: PuzzleCanvasProps) => {
			const previous = props;
			props = nextProps;

			// Reset the piece when the challenge data changes (new puzzle on retry).
			if (
				nextProps.originX !== previous.originX ||
				nextProps.originY !== previous.originY
			) {
				posX = nextProps.originX;
				posY = nextProps.originY;
				keyboardDragging = false;
			}

			if (nextProps.submitting !== previous.submitting) {
				announceStatus();
			} else if (nextProps.showRetry && !previous.showRetry) {
				announceStatus();
			}

			if (nextProps.showRetry && !previous.showRetry) {
				startShake();
				return;
			}

			render();
		},
		destroy: () => {
			teardown.run();
			surface.destroy();
		},
	};
};
