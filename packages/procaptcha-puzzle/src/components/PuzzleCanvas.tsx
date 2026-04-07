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
}

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;
const TARGET_SIZE = 30;
const PIECE_SIZE = 24;

export const PuzzleCanvas = ({
	originX,
	originY,
	targetX,
	targetY,
	onComplete,
}: PuzzleCanvasProps) => {
	const [posX, setPosX] = useState<number>(originX);
	const [posY, setPosY] = useState<number>(originY);
	const isDragging = useRef<boolean>(false);
	const puzzleEvents = useRef<Array<PuzzleEvent>>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

		// Use a microtask to read the latest state values after the final render
		const currentEvents = [...puzzleEvents.current];
		// Read the latest position from the last puzzle event, or fall back to origin
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
			isDragging.current = true;
			puzzleEvents.current = [];
			const containerOffset = getContainerOffset();
			offsetRef.current = {
				x: event.clientX - containerOffset.x - posX,
				y: event.clientY - containerOffset.y - posY,
			};
		},
		[getContainerOffset, posX, posY],
	);

	const handlePieceTouchStart = useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
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
		[getContainerOffset, posX, posY],
	);

	return (
		<div
			ref={containerRef}
			style={{
				position: "relative",
				width: `${CONTAINER_WIDTH}px`,
				height: `${CONTAINER_HEIGHT}px`,
				background: "#f0f0f0",
				borderRadius: "8px",
				overflow: "hidden",
				userSelect: "none",
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
					border: "2px dashed #888",
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
					background: "#4a90d9",
					cursor: isDragging.current ? "grabbing" : "grab",
				}}
			/>
		</div>
	);
};
