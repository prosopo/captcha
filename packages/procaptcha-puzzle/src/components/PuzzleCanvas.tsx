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

import { useTranslation } from "@prosopo/locale";
import { ChallengeSurface, isEventTrusted } from "@prosopo/procaptcha-common";
import type { PlacementType, PuzzleEvent } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

interface PuzzleCanvasProps {
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

const VISUALLY_HIDDEN: CSSProperties = {
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

export const PuzzleCanvas = ({
	originX,
	originY,
	background,
	piece,
	pieceSize,
	onComplete,
	showRetry,
	submitting,
	theme,
	placement,
	anchor,
	onDismiss,
}: PuzzleCanvasProps) => {
	const [posX, setPosX] = useState<number>(originX);
	const [posY, setPosY] = useState<number>(originY);
	const isDragging = useRef<boolean>(false);
	// Mirror of isDragging in state so the render layer can key drag-time
	// effects (parallax, filter) off it — a ref does not trigger re-renders
	// when it flips, so styles wouldn't switch to the drag branch at grab or
	// snap back on release.
	const [dragging, setDragging] = useState(false);
	const puzzleEvents = useRef<PuzzleEvent[]>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const [visible, setVisible] = useState(false);
	const [shaking, setShaking] = useState(false);
	const { t } = useTranslation();
	const baseId = useId();
	const instructionId = `${baseId}-instruction`;
	const keyboardHintId = `${baseId}-keyboard-hint`;
	// Set to true by the first arrow press of a keyboard run, so the run starts
	// from a clean trail exactly as a fresh mouse grab does.
	const keyboardDragging = useRef<boolean>(false);
	const [announcement, setAnnouncement] = useState<string>("");
	const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Reset piece position when challenge data changes (new puzzle on retry)
	useEffect(() => {
		setPosX(originX);
		setPosY(originY);
		keyboardDragging.current = false;
	}, [originX, originY]);

	// Trigger entrance animation after mount
	useEffect(() => {
		const frame = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	// Trigger shake on retry
	useEffect(() => {
		if (showRetry) {
			setShaking(true);
			const timer = setTimeout(() => setShaking(false), 500);
			return () => clearTimeout(timer);
		}
		return () => {};
	}, [showRetry]);

	const clamp = useCallback(
		(value: number, min: number, max: number): number => {
			return Math.max(min, Math.min(max, value));
		},
		[],
	);

	const announce = useCallback((message: string, delayMs = 0): void => {
		if (announceTimer.current) {
			clearTimeout(announceTimer.current);
			announceTimer.current = null;
		}
		if (delayMs === 0) {
			setAnnouncement(message);
			return;
		}
		announceTimer.current = setTimeout(() => setAnnouncement(message), delayMs);
	}, []);

	useEffect(
		() => () => {
			if (announceTimer.current) clearTimeout(announceTimer.current);
		},
		[],
	);

	// Pixel coordinates mean nothing to someone who cannot see the board, and
	// the widget is never told where the target is, so proportions are the only
	// bearing it can honestly offer.
	const describePosition = useCallback(
		(x: number, y: number): string =>
			t("WIDGET.PUZZLE.POSITION", {
				defaultValue: "{{x}} percent across, {{y}} percent down",
				x: Math.round((x / CONTAINER_WIDTH) * 100),
				y: Math.round((y / CONTAINER_HEIGHT) * 100),
			}),
		[t],
	);

	const getContainerOffset = useCallback((): { x: number; y: number } => {
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			return { x: rect.left, y: rect.top };
		}
		return { x: 0, y: 0 };
	}, []);

	const handleMoveEvent = useCallback(
		(clientX: number, clientY: number) => {
			if (!isDragging.current) {
				return;
			}

			const containerOffset = getContainerOffset();
			const newX = clamp(
				clientX - containerOffset.x - offsetRef.current.x,
				0,
				CONTAINER_WIDTH,
			);
			const newY = clamp(
				clientY - containerOffset.y - offsetRef.current.y,
				0,
				CONTAINER_HEIGHT,
			);

			setPosX(newX);
			setPosY(newY);

			puzzleEvents.current.push({ x: newX, y: newY, t: Date.now() });
		},
		[clamp, getContainerOffset],
	);

	const complete = useCallback(
		(finalX: number, finalY: number): void => {
			onComplete(finalX, finalY, [...puzzleEvents.current]);
		},
		[onComplete],
	);

	const handleEndEvent = useCallback(() => {
		if (!isDragging.current) {
			return;
		}

		isDragging.current = false;
		setDragging(false);

		const lastEvent = puzzleEvents.current[puzzleEvents.current.length - 1];
		complete(
			lastEvent ? lastEvent.x : originX,
			lastEvent ? lastEvent.y : originY,
		);
	}, [complete, originX, originY]);

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			handleMoveEvent(event.clientX, event.clientY);
		},
		[handleMoveEvent],
	);

	const handleTouchMove = useCallback(
		(event: TouchEvent) => {
			const touch = event.touches[0];
			if (touch) {
				handleMoveEvent(touch.clientX, touch.clientY);
			}
		},
		[handleMoveEvent],
	);

	const handleMouseUp = useCallback(() => {
		handleEndEvent();
	}, [handleEndEvent]);

	const handleTouchEnd = useCallback(() => {
		handleEndEvent();
	}, [handleEndEvent]);

	useEffect(() => {
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("touchmove", handleTouchMove);
		document.addEventListener("touchend", handleTouchEnd);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("touchmove", handleTouchMove);
			document.removeEventListener("touchend", handleTouchEnd);
		};
	}, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

	const handlePieceMouseDown = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (submitting) return;
			isDragging.current = true;
			keyboardDragging.current = false;
			setDragging(true);
			puzzleEvents.current = [];
			const containerOffset = getContainerOffset();
			offsetRef.current = {
				x: event.clientX - containerOffset.x - posX,
				y: event.clientY - containerOffset.y - posY,
			};
		},
		[getContainerOffset, posX, posY, submitting],
	);

	const handlePieceTouchStart = useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
			if (submitting) return;
			const touch = event.touches[0];
			if (touch) {
				isDragging.current = true;
				keyboardDragging.current = false;
				setDragging(true);
				puzzleEvents.current = [];
				const containerOffset = getContainerOffset();
				offsetRef.current = {
					x: touch.clientX - containerOffset.x - posX,
					y: touch.clientY - containerOffset.y - posY,
				};
			}
		},
		[getContainerOffset, posX, posY, submitting],
	);

	const moveByKeyboard = useCallback(
		(deltaX: number, deltaY: number): void => {
			if (!keyboardDragging.current) {
				keyboardDragging.current = true;
				puzzleEvents.current = [];
			}

			const nextX = clamp(posX + deltaX, 0, CONTAINER_WIDTH);
			const nextY = clamp(posY + deltaY, 0, CONTAINER_HEIGHT);

			setPosX(nextX);
			setPosY(nextY);
			puzzleEvents.current.push({ x: nextX, y: nextY, t: Date.now() });
			announce(describePosition(nextX, nextY), ANNOUNCE_DEBOUNCE_MS);
		},
		[announce, clamp, describePosition, posX, posY],
	);

	const handlePieceKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>): void => {
			if (submitting) return;
			if (!isEventTrusted(event)) return;

			const step = event.shiftKey ? FINE_STEP_PX : STEP_PX;
			const moves: Record<string, [number, number] | undefined> = {
				ArrowLeft: [-step, 0],
				ArrowRight: [step, 0],
				ArrowUp: [0, -step],
				ArrowDown: [0, step],
				Home: [originX - posX, originY - posY],
			};

			const move = moves[event.key];
			if (move) {
				event.preventDefault();
				moveByKeyboard(move[0], move[1]);
				return;
			}

			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				// Ends the run, so the next arrow press opens a clean trail just
				// as the next mouse grab would.
				keyboardDragging.current = false;
				complete(posX, posY);
			}
		},
		[complete, moveByKeyboard, originX, originY, posX, posY, submitting],
	);

	const handlePieceFocus = useCallback((): void => {
		announce(describePosition(posX, posY));
	}, [announce, describePosition, posX, posY]);

	const instructionText = showRetry
		? t("WIDGET.PUZZLE.RETRY", { defaultValue: "Not quite \u2014 try again" })
		: t("WIDGET.PUZZLE.DRAG", {
				defaultValue: "Drag the piece to the target",
			});

	const keyboardHintText = t("WIDGET.PUZZLE.KEYBOARD_HINT", {
		defaultValue:
			"Use the arrow keys to move the piece, holding shift for smaller steps. Press Enter to submit it, Home to put it back at the start, or Escape to cancel.",
	});

	useEffect(() => {
		if (!submitting) return;
		announce(
			t("WIDGET.PUZZLE.CHECKING", { defaultValue: "Checking your answer" }),
		);
	}, [submitting, announce, t]);

	useEffect(() => {
		if (!showRetry) return;
		announce(
			t("WIDGET.PUZZLE.RETRY_ANNOUNCEMENT", {
				defaultValue:
					"Not quite. A new puzzle has loaded and the piece is back at the start.",
			}),
		);
	}, [showRetry, announce, t]);

	const headerBorderColor = showRetry
		? theme.palette.error.main
		: "transparent";

	const headerTextColor = showRetry
		? theme.palette.error.main
		: theme.palette.onSurface;

	// Material 3 purple tonal fallback shown before the server-rendered
	// background image loads.
	const puzzleAreaBg = `linear-gradient(135deg, ${theme.palette.surface} 0%, ${theme.palette.primaryContainer.main} 50%, ${theme.palette.surface} 100%)`;

	// Client-side reaction to drag motion. Purely visual — computed from the
	// piece's displacement from its starting position, never from anything
	// that could hint at the target (the widget does not know the target).
	// The background translates a few pixels *opposite* the piece for a
	// parallax feel, and shifts hue/saturation with drag distance for a
	// subtle live-canvas effect. On release everything eases back via CSS
	// transition on the img element.
	const deltaX = posX - originX;
	const deltaY = posY - originY;
	const dragDistance = Math.hypot(deltaX, deltaY);
	const PARALLAX_FACTOR = 0.08;
	const bgTranslateX = dragging ? -deltaX * PARALLAX_FACTOR : 0;
	const bgTranslateY = dragging ? -deltaY * PARALLAX_FACTOR : 0;
	const bgScale = dragging ? 1.03 : 1;
	// Cap the filter influence so a long drag doesn't kaleidoscope the frame.
	const hueShift = dragging ? Math.max(-18, Math.min(18, deltaX * 0.12)) : 0;
	const satBoost = dragging ? 1 + Math.min(0.25, dragDistance * 0.0035) : 1;
	const brightness = dragging ? 1 - Math.min(0.06, dragDistance * 0.0008) : 1;
	const bgFilter = `hue-rotate(${hueShift.toFixed(2)}deg) saturate(${satBoost.toFixed(3)}) brightness(${brightness.toFixed(3)})`;
	const bgTransform = `translate(${bgTranslateX.toFixed(2)}px, ${bgTranslateY.toFixed(2)}px) scale(${bgScale.toFixed(3)})`;

	return (
		<ChallengeSurface
			show
			placement={placement}
			anchor={anchor}
			onDismiss={onDismiss}
			scrim={visible ? "dim" : "none"}
			dialogLabel={t("WIDGET.PUZZLE.DIALOG_LABEL", {
				defaultValue: "Puzzle challenge",
			})}
		>
			<style>{stylesheet(theme.palette.primary.main)}</style>

			{/* Progress the piece cannot show a screen reader: where it has got
			    to, that a solution is being checked, and that a failed go has
			    been replaced by a fresh puzzle. */}
			<output aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN}>
				{announcement}
			</output>

			<div id={keyboardHintId} style={VISUALLY_HIDDEN}>
				{keyboardHintText}
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0",
					opacity: visible ? 1 : 0,
					transform: visible ? "scale(1)" : "scale(0.9)",
					transition: "opacity 0.3s ease, transform 0.3s ease",
					animation: shaking ? "prosopo-puzzle-shake 0.5s ease" : "none",
				}}
			>
				{/* Instruction text */}
				<div
					id={instructionId}
					style={{
						backgroundColor: theme.palette.surface,
						borderRadius: "20px 20px 0 0",
						padding: "12px 20px",
						width: `${CONTAINER_WIDTH}px`,
						boxSizing: "border-box",
						textAlign: "center",
						fontFamily: theme.font.fontFamily,
						fontSize: "14px",
						fontWeight: 500,
						color: headerTextColor,
						borderBottom: `2px solid ${headerBorderColor}`,
						transition: "color 0.3s ease, border-color 0.3s ease",
					}}
				>
					{instructionText}
				</div>

				{/* Puzzle area */}
				<div
					ref={containerRef}
					style={{
						position: "relative",
						width: `${CONTAINER_WIDTH}px`,
						height: `${CONTAINER_HEIGHT}px`,
						background: puzzleAreaBg,
						borderRadius: "0 0 20px 20px",
						overflow: "hidden",
						userSelect: "none",
						opacity: submitting ? 0.6 : 1,
						pointerEvents: submitting ? "none" : "auto",
						transition: "opacity 0.2s ease",
					}}
				>
					{/* Background. The notch is cut into these pixels by the
					    provider; the widget is never told where it is. The
					    transform/filter below react only to piece displacement,
					    so no target information leaks through them.

					    The background is tiled as a 3×3 mirrored kaleidoscope so
					    the parallax translate never reveals a blank margin — the
					    surrounding 8 tiles are the same image mirrored on each
					    axis, giving a seamless continuation in every direction. */}
					<div
						style={{
							position: "absolute",
							// Position the wrapper so the centre tile lands at (0, 0),
							// i.e. exactly where the untranslated background would sit.
							left: `-${CONTAINER_WIDTH}px`,
							top: `-${CONTAINER_HEIGHT}px`,
							width: `${CONTAINER_WIDTH * 3}px`,
							height: `${CONTAINER_HEIGHT * 3}px`,
							pointerEvents: "none",
							userSelect: "none",
							transform: bgTransform,
							transformOrigin: "center center",
							filter: bgFilter,
							transition: dragging
								? "none"
								: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), filter 0.35s ease",
							willChange: "transform, filter",
						}}
					>
						{[
							// [col, row, scaleX, scaleY]
							[0, 0, -1, -1],
							[1, 0, 1, -1],
							[2, 0, -1, -1],
							[0, 1, -1, 1],
							[1, 1, 1, 1],
							[2, 1, -1, 1],
							[0, 2, -1, -1],
							[1, 2, 1, -1],
							[2, 2, -1, -1],
						].map(([col, row, sx, sy]) => {
							const key = `${col}-${row}`;
							return (
								<img
									key={key}
									src={background}
									alt=""
									draggable={false}
									style={{
										position: "absolute",
										left: `${(col ?? 0) * CONTAINER_WIDTH}px`,
										top: `${(row ?? 0) * CONTAINER_HEIGHT}px`,
										width: `${CONTAINER_WIDTH}px`,
										height: `${CONTAINER_HEIGHT}px`,
										transform: `scale(${sx}, ${sy})`,
										pointerEvents: "none",
										userSelect: "none",
									}}
								/>
							);
						})}
					</div>
					{/* Puzzle piece.

					    `application` rather than `button`: in the browse mode
					    NVDA and JAWS default to, arrow keys move the reading
					    cursor through the page and never reach a button's key
					    handler. `application` is the role that hands them
					    straight to this element, which is what makes the drag
					    reachable without a pointer at all.

					    The role and class are a stable production selector,
					    which the data-cy below is deliberately not. A scripted
					    solver could already find this element — it is the only
					    draggable thing on the surface — whereas without them a
					    keyboard or screen-reader user cannot find it at all. */}
					<div
						// Test-only selector: gated on NODE_ENV !== "production"
						// so esbuild constant-folds it out of production bundles.
						// Cypress builds the bundle with NODE_ENV=development
						// (.github/workflows/cypress.yml:110) so the selector
						// is present under test.
						{...(process.env.NODE_ENV !== "production" && {
							"data-cy": "prosopo-puzzle-piece",
						})}
						className={PIECE_CSS_CLASS}
						role="application"
						aria-roledescription={t("WIDGET.PUZZLE.PIECE_ROLE", {
							defaultValue: "draggable puzzle piece",
						})}
						aria-label={t("WIDGET.PUZZLE.PIECE_LABEL", {
							defaultValue: "Puzzle piece",
						})}
						aria-describedby={`${instructionId} ${keyboardHintId}`}
						tabIndex={submitting ? -1 : 0}
						onFocus={handlePieceFocus}
						onKeyDown={handlePieceKeyDown}
						onMouseDown={handlePieceMouseDown}
						onTouchStart={handlePieceTouchStart}
						style={{
							position: "absolute",
							left: `${posX - pieceSize / 2}px`,
							top: `${posY - pieceSize / 2}px`,
							width: `${pieceSize}px`,
							height: `${pieceSize}px`,
							backgroundImage: `url(${piece})`,
							backgroundSize: "100% 100%",
							// Without this, a touch on a zoomed-in mobile viewport is
							// claimed by the browser as a pan gesture before our
							// touchmove handler ever runs, so the page scrolls instead
							// of the piece moving.
							touchAction: "none",
							cursor: submitting
								? "default"
								: isDragging.current
									? "grabbing"
									: "grab",
							filter: isDragging.current
								? "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))"
								: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35))",
							transition: isDragging.current
								? "none"
								: "filter 0.2s ease, left 0.3s ease, top 0.3s ease",
						}}
					/>
				</div>
			</div>
		</ChallengeSurface>
	);
};
