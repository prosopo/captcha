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

import { AudioAlternativeButton } from "@prosopo/procaptcha-common";
import type { PuzzleEvent } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";

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
	/**
	 * Renders a "use audio instead" control below the puzzle when the site
	 * has the audio accessibility path enabled. Undefined hides it — the
	 * control must not appear on sites that have not opted in, because the
	 * audio challenge is English-only and an operator who has not checked
	 * that against their audience should not have it exposed.
	 */
	audioAlternative?: {
		onRequestAudio: () => void;
		label: string;
	};
}

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-puzzle-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
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
	audioAlternative,
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

	// Reset piece position when challenge data changes (new puzzle on retry)
	useEffect(() => {
		setPosX(originX);
		setPosY(originY);
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

	const handleEndEvent = useCallback(() => {
		if (!isDragging.current) {
			return;
		}

		isDragging.current = false;
		setDragging(false);

		const currentEvents = [...puzzleEvents.current];
		const lastEvent = currentEvents[currentEvents.length - 1];
		const finalX = lastEvent ? lastEvent.x : originX;
		const finalY = lastEvent ? lastEvent.y : originY;

		onComplete(finalX, finalY, currentEvents);
	}, [onComplete, originX, originY]);

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

	const instructionText = showRetry
		? "Not quite \u2014 try again"
		: "Drag the piece to the target";

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
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 2147483646,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: visible ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0)",
				transition: "background-color 0.3s ease",
			}}
		>
			{/* Inject shake keyframes */}
			<style>{SHAKE_KEYFRAMES}</style>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "0",
					zIndex: 2147483647,
					opacity: visible ? 1 : 0,
					transform: visible ? "scale(1)" : "scale(0.9)",
					transition: "opacity 0.3s ease, transform 0.3s ease",
					animation: shaking ? "prosopo-puzzle-shake 0.5s ease" : "none",
				}}
			>
				{/* Instruction text */}
				<div
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
						// Square off the bottom when the audio-alternative
						// footer sits below it, or two elements both round the
						// same corner and the seam shows.
						borderRadius: audioAlternative ? "0" : "0 0 20px 20px",
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
					{/* Puzzle piece */}
					<div
						// Test-only selector: gated on NODE_ENV !== "production"
						// so esbuild constant-folds it out of production bundles.
						// The whole point of the puzzle drag is that a bot
						// shouldn't be able to `querySelector` its way to the
						// interactive element; shipping a stable data-cy would
						// hand that to any scripted solver for free. Cypress
						// builds the bundle with NODE_ENV=development
						// (.github/workflows/cypress.yml:110) so the selector
						// is present under test.
						{...(process.env.NODE_ENV !== "production" && {
							"data-cy": "prosopo-puzzle-piece",
						})}
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

				{/* Audio alternative — below the puzzle area, so it reads as
				    "or do this instead" rather than as part of the puzzle. */}
				{audioAlternative && (
					<div
						style={{
							backgroundColor: theme.palette.surface,
							borderRadius: "0 0 20px 20px",
							padding: "8px",
							width: `${CONTAINER_WIDTH}px`,
							boxSizing: "border-box",
							textAlign: "center",
						}}
					>
						<AudioAlternativeButton
							themeColor={theme.palette.mode === "dark" ? "dark" : "light"}
							onRequestAudio={audioAlternative.onRequestAudio}
							label={audioAlternative.label}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
