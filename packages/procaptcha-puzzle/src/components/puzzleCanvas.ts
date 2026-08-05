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
	Teardown,
	applyAttributes,
	applyStyles,
	createElement,
} from "@prosopo/procaptcha-common";
import type { PuzzleEvent } from "@prosopo/types";

export interface PuzzleCanvasProps {
	originX: number;
	originY: number;
	targetX: number;
	targetY: number;
	onComplete: (
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
	) => void;
	showRetry: boolean;
	submitting: boolean;
}

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;
const TARGET_SIZE = 30;
const PIECE_SIZE = 24;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-puzzle-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value));

export const mountPuzzleCanvas = (
	container: HTMLElement,
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

	const style = createElement("style", { text: SHAKE_KEYFRAMES });

	const target = createElement("div", {
		style: {
			position: "absolute",
			width: `${TARGET_SIZE}px`,
			height: `${TARGET_SIZE}px`,
			borderRadius: "50%",
			border: "2px dashed rgba(74, 144, 217, 0.6)",
			backgroundColor: "rgba(74, 144, 217, 0.08)",
			boxSizing: "border-box",
		},
	});

	const piece = createElement("div", {
		style: {
			position: "absolute",
			width: `${PIECE_SIZE}px`,
			height: `${PIECE_SIZE}px`,
			borderRadius: "50%",
			background: "radial-gradient(circle at 40% 40%, #6ab0ff, #4a90d9)",
		},
	});

	// Test-only selector: gated on NODE_ENV !== "production" so the bundler
	// constant-folds it out of production builds. The whole point of the puzzle
	// drag is that a bot shouldn't be able to `querySelector` its way to the
	// interactive element; shipping a stable data-cy would hand that to any
	// scripted solver for free. Cypress builds the bundle with
	// NODE_ENV=development (.github/workflows/cypress.yml:110) so the selector
	// is present under test.
	if ("production" !== process.env.NODE_ENV) {
		applyAttributes(piece, { "data-cy": "prosopo-puzzle-piece" });
	}

	const area = createElement("div", {
		style: {
			position: "relative",
			width: `${CONTAINER_WIDTH}px`,
			height: `${CONTAINER_HEIGHT}px`,
			background:
				"linear-gradient(135deg, #e8eaf6 0%, #c5cae9 50%, #e8eaf6 100%)",
			borderRadius: "0 0 8px 8px",
			overflow: "hidden",
			userSelect: "none",
			boxShadow:
				"0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)",
			transition: "opacity 0.2s ease",
		},
		children: [target, piece],
	});

	const instruction = createElement("div", {
		style: {
			backgroundColor: "#fff",
			borderRadius: "8px 8px 0 0",
			padding: "12px 20px",
			width: `${CONTAINER_WIDTH}px`,
			boxSizing: "border-box",
			textAlign: "center",
			fontFamily:
				'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
			fontSize: "14px",
			fontWeight: 500,
			boxShadow:
				"0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)",
			transition: "color 0.3s ease, border-color 0.3s ease",
		},
	});

	const panel = createElement("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: "0",
			zIndex: 2147483647,
			transition: "opacity 0.3s ease, transform 0.3s ease",
		},
		children: [instruction, area],
	});

	const root = createElement("div", {
		style: {
			position: "fixed",
			inset: 0,
			zIndex: 2147483646,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			transition: "background-color 0.3s ease",
		},
		children: [style, panel],
	});

	// The piece position is written straight to the element rather than going
	// through a render pass: a pointermove would otherwise rebuild the whole
	// overlay for a two-pixel move.
	const applyPiecePosition = () => {
		applyStyles(piece, {
			left: `${posX - PIECE_SIZE / 2}px`,
			top: `${posY - PIECE_SIZE / 2}px`,
		});
	};

	const applyPieceChrome = () => {
		applyStyles(piece, {
			cursor: props.submitting ? "default" : dragging ? "grabbing" : "grab",
			boxShadow: dragging
				? "0 4px 12px rgba(74, 144, 217, 0.5)"
				: "0 2px 6px rgba(74, 144, 217, 0.3)",
			transition: dragging
				? "none"
				: "box-shadow 0.2s ease, left 0.3s ease, top 0.3s ease",
		});
	};

	const render = () => {
		applyStyles(root, {
			backgroundColor: visible ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0)",
		});
		applyStyles(panel, {
			opacity: visible ? 1 : 0,
			transform: visible ? "scale(1)" : "scale(0.9)",
			animation: shaking ? "prosopo-puzzle-shake 0.5s ease" : "none",
		});
		instruction.textContent = props.showRetry
			? "Not quite — try again"
			: "Drag the piece to the target";
		applyStyles(instruction, {
			color: props.showRetry ? "#dc3545" : "#333",
			borderBottom: `2px solid ${
				props.showRetry ? "rgba(220, 53, 69, 0.4)" : "transparent"
			}`,
		});
		applyStyles(area, {
			opacity: props.submitting ? 0.6 : 1,
			pointerEvents: props.submitting ? "none" : "auto",
		});
		applyStyles(target, {
			left: `${props.targetX - TARGET_SIZE / 2}px`,
			top: `${props.targetY - TARGET_SIZE / 2}px`,
		});
		applyPiecePosition();
		applyPieceChrome();
	};

	const containerOffset = (): { x: number; y: number } => {
		const rect = area.getBoundingClientRect();
		return { x: rect.left, y: rect.top };
	};

	const handleMove = (clientX: number, clientY: number) => {
		if (!dragging) {
			return;
		}

		const offset = containerOffset();
		posX = clamp(clientX - offset.x - dragOffset.x, 0, CONTAINER_WIDTH);
		posY = clamp(clientY - offset.y - dragOffset.y, 0, CONTAINER_HEIGHT);
		applyPiecePosition();

		puzzleEvents.push({ x: posX, y: posY, t: Date.now() });
	};

	const handleEnd = () => {
		if (!dragging) {
			return;
		}
		dragging = false;
		applyPieceChrome();

		const currentEvents = [...puzzleEvents];
		const lastEvent = currentEvents[currentEvents.length - 1];
		const finalX = lastEvent ? lastEvent.x : props.originX;
		const finalY = lastEvent ? lastEvent.y : props.originY;

		props.onComplete(finalX, finalY, currentEvents);
	};

	const beginDrag = (clientX: number, clientY: number) => {
		if (props.submitting) {
			return;
		}
		dragging = true;
		puzzleEvents = [];
		const offset = containerOffset();
		dragOffset = { x: clientX - offset.x - posX, y: clientY - offset.y - posY };
		applyPieceChrome();
	};

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
	container.appendChild(root);

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
	});

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
			}

			if (nextProps.showRetry && !previous.showRetry) {
				startShake();
				return;
			}

			render();
		},
		destroy: () => {
			teardown.run();
			root.parentNode?.removeChild(root);
		},
	};
};
