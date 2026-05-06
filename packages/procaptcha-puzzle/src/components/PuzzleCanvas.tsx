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

import { useCallback, useEffect, useRef, useState } from "react";

interface PuzzleEvent {
	x: number;
	y: number;
	t: number;
}

interface PuzzleCanvasProps {
	originX: number;
	originY: number;
	targetX: number;
	targetY: number;
	onComplete: (
		finalX: number,
		finalY: number,
		puzzleEvents: Array<PuzzleEvent>,
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

export const PuzzleCanvas = ({
	originX,
	originY,
	targetX,
	targetY,
	onComplete,
	showRetry,
	submitting,
}: PuzzleCanvasProps) => {
	const [posX, setPosX] = useState<number>(originX);
	const [posY, setPosY] = useState<number>(originY);
	const isDragging = useRef<boolean>(false);
	const puzzleEvents = useRef<Array<PuzzleEvent>>([]);
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
		? "rgba(220, 53, 69, 0.4)"
		: "transparent";

	const headerTextColor = showRetry ? "#dc3545" : "#333";

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
						color: headerTextColor,
						borderBottom: `2px solid ${headerBorderColor}`,
						boxShadow:
							"0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)",
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
						background:
							"linear-gradient(135deg, #e8eaf6 0%, #c5cae9 50%, #e8eaf6 100%)",
						borderRadius: "0 0 8px 8px",
						overflow: "hidden",
						userSelect: "none",
						boxShadow:
							"0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)",
						opacity: submitting ? 0.6 : 1,
						pointerEvents: submitting ? "none" : "auto",
						transition: "opacity 0.2s ease",
					}}
				>
					{/* Target zone */}
					<div
						style={{
							position: "absolute",
							left: `${targetX - TARGET_SIZE / 2}px`,
							top: `${targetY - TARGET_SIZE / 2}px`,
							width: `${TARGET_SIZE}px`,
							height: `${TARGET_SIZE}px`,
							borderRadius: "50%",
							border: "2px dashed rgba(74, 144, 217, 0.6)",
							backgroundColor: "rgba(74, 144, 217, 0.08)",
							boxSizing: "border-box",
						}}
					/>
					{/* Puzzle piece */}
					<div
						onMouseDown={handlePieceMouseDown}
						onTouchStart={handlePieceTouchStart}
						style={{
							position: "absolute",
							left: `${posX - PIECE_SIZE / 2}px`,
							top: `${posY - PIECE_SIZE / 2}px`,
							width: `${PIECE_SIZE}px`,
							height: `${PIECE_SIZE}px`,
							borderRadius: "50%",
							background:
								"radial-gradient(circle at 40% 40%, #6ab0ff, #4a90d9)",
							cursor: submitting
								? "default"
								: isDragging.current
									? "grabbing"
									: "grab",
							boxShadow: isDragging.current
								? "0 4px 12px rgba(74, 144, 217, 0.5)"
								: "0 2px 6px rgba(74, 144, 217, 0.3)",
							transition: isDragging.current
								? "none"
								: "box-shadow 0.2s ease, left 0.3s ease, top 0.3s ease",
						}}
					/>
				</div>
			</div>
		</div>
	);
};
