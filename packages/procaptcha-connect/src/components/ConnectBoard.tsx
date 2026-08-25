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

import type { ConnectEvent, ConnectTile } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ConnectBoardProps {
	boardSize: number;
	tiles: ConnectTile[];
	onComplete: (
		sourceIndex: number,
		targetIndex: number,
		connectEvents: ConnectEvent[],
	) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	/** Localised copy, so the widget never hard-codes English. */
	instruction: string;
	retryText: string;
}

// The board is laid out to this width where the cell size allows, matching the
// puzzle canvas so the two challenge types feel like the same product. Larger
// boards grow past it rather than shrinking the tiles below MIN_CELL_PX, where
// the silhouettes stop being distinguishable on a phone.
const TARGET_BOARD_PX = 320;
const BOARD_PADDING_PX = 14;
const CELL_GAP_PX = 6;
const MIN_CELL_PX = 34;
const MAX_CELL_PX = 56;

const KEYFRAMES = `
@keyframes prosopo-connect-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
@keyframes prosopo-connect-pulse {
	0%, 100% { opacity: 0.5; transform: scale(1); }
	50% { opacity: 1; transform: scale(1.12); }
}
@keyframes prosopo-connect-pop {
	0% { transform: scale(0.7); opacity: 0.6; }
	55% { transform: scale(1.14); opacity: 1; }
	100% { transform: scale(1); opacity: 1; }
}
@keyframes prosopo-connect-rise {
	from { opacity: 0; transform: translateY(6px) scale(0.9); }
	to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

/** Cell edge in px for a given board, clamped so tiles stay legible. */
export const cellSizeFor = (boardSize: number): number => {
	const available =
		TARGET_BOARD_PX - BOARD_PADDING_PX * 2 - CELL_GAP_PX * (boardSize - 1);
	return Math.max(
		MIN_CELL_PX,
		Math.min(MAX_CELL_PX, Math.floor(available / boardSize)),
	);
};

/** Total board edge in px, including padding and gutters. */
export const boardSizePx = (boardSize: number): number =>
	BOARD_PADDING_PX * 2 +
	cellSizeFor(boardSize) * boardSize +
	CELL_GAP_PX * (boardSize - 1);

/** What a pointer-down landed on, so pointer-up can interpret the gesture. */
interface PressState {
	index: number;
	/** Whether this tile was already the selected one before the press. */
	wasSelected: boolean;
	/** True once the pointer has travelled far enough to count as a drag. */
	moved: boolean;
}

export const ConnectBoard = ({
	boardSize,
	tiles,
	onComplete,
	showRetry,
	submitting,
	theme,
	instruction,
	retryText,
}: ConnectBoardProps) => {
	const cell = cellSizeFor(boardSize);
	const boardPx = boardSizePx(boardSize);

	// Cell positions, as values rather than map indices: a cell's board
	// position *is* its identity here, so it is also the correct React key.
	const cellIndices = useMemo(
		() => Array.from({ length: boardSize * boardSize }, (_, i) => i),
		[boardSize],
	);

	// index -> tile image. Absent means the cell is empty.
	const imageByIndex = useMemo(() => {
		const map = new Map<number, string>();
		for (const tile of tiles) map.set(tile.index, tile.image);
		return map;
	}, [tiles]);

	const [selected, setSelected] = useState<number | null>(null);
	const [hoveredCell, setHoveredCell] = useState<number | null>(null);
	// Pointer position while a tile is being carried, in viewport coordinates.
	// Null when the tile is selected by click rather than held under a pointer.
	const [carry, setCarry] = useState<{ x: number; y: number } | null>(null);
	const [visible, setVisible] = useState(false);
	const [shaking, setShaking] = useState(false);
	// Set the moment a move is committed, so the board shows the move landing
	// rather than sitting inert until the submit round-trip resolves.
	const [placed, setPlaced] = useState<{ from: number; to: number } | null>(
		null,
	);

	const boardRef = useRef<HTMLDivElement | null>(null);
	const events = useRef<ConnectEvent[]>([]);
	const interactionStartedAt = useRef<number>(0);
	const pressRef = useRef<PressState | null>(null);

	// Reset per-challenge state when a new board arrives. `tiles` identity is
	// the new-challenge signal: the manager hands back a fresh array each time.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `tiles` identity is deliberately the trigger
	useEffect(() => {
		setSelected(null);
		setHoveredCell(null);
		setCarry(null);
		setPlaced(null);
		pressRef.current = null;
		events.current = [];
	}, [tiles]);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (!showRetry) return () => {};
		setShaking(true);
		const timer = setTimeout(() => setShaking(false), 500);
		return () => clearTimeout(timer);
	}, [showRetry]);

	/**
	 * Record a pointer sample in normalised board coordinates.
	 *
	 * Normalised rather than raw pixels so the trail means the same thing
	 * whichever board size was served and whatever the host page has scaled the
	 * widget to — otherwise a verifier comparing trails across sessions would
	 * be comparing different units.
	 */
	const record = useCallback((clientX: number, clientY: number) => {
		const rect = boardRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return;
		events.current.push({
			x: Number(((clientX - rect.left) / rect.width).toFixed(4)),
			y: Number(((clientY - rect.top) / rect.height).toFixed(4)),
			t: Date.now() - interactionStartedAt.current,
		});
	}, []);

	/** The cell under the given viewport point, or null if outside the board. */
	const cellAtPoint = useCallback(
		(clientX: number, clientY: number): number | null => {
			const rect = boardRef.current?.getBoundingClientRect();
			if (!rect) return null;
			const x = clientX - rect.left - BOARD_PADDING_PX;
			const y = clientY - rect.top - BOARD_PADDING_PX;
			const stride = cell + CELL_GAP_PX;
			const col = Math.floor(x / stride);
			const row = Math.floor(y / stride);
			if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) {
				return null;
			}
			// Reject the gutters between cells, so a drop that lands in the gap
			// isn't silently snapped to whichever neighbour rounds first.
			if (x - col * stride > cell || y - row * stride > cell) return null;
			return row * boardSize + col;
		},
		[boardSize, cell],
	);

	const commit = useCallback(
		(from: number, to: number) => {
			setPlaced({ from, to });
			setSelected(null);
			setCarry(null);
			setHoveredCell(null);
			pressRef.current = null;
			onComplete(from, to, [...events.current]);
		},
		[onComplete],
	);

	const clearSelection = useCallback(() => {
		setSelected(null);
		setCarry(null);
		setHoveredCell(null);
		pressRef.current = null;
	}, []);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>, index: number) => {
			if (submitting || placed) return;
			if (!imageByIndex.has(index)) return;
			event.currentTarget.setPointerCapture(event.pointerId);
			const wasSelected = selected === index;
			// Start a fresh trail only when the interaction starts from nothing,
			// so a click-select followed by a click-place is recorded as one
			// continuous gesture rather than two truncated ones.
			if (selected === null) {
				interactionStartedAt.current = Date.now();
				events.current = [];
			}
			pressRef.current = { index, wasSelected, moved: false };
			setSelected(index);
			setCarry({ x: event.clientX, y: event.clientY });
			record(event.clientX, event.clientY);
		},
		[imageByIndex, placed, record, selected, submitting],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (selected === null || carry === null) return;
			if (pressRef.current) pressRef.current.moved = true;
			setCarry({ x: event.clientX, y: event.clientY });
			record(event.clientX, event.clientY);
			const over = cellAtPoint(event.clientX, event.clientY);
			setHoveredCell(over !== null && !imageByIndex.has(over) ? over : null);
		},
		[carry, cellAtPoint, imageByIndex, record, selected],
	);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (selected === null) return;
			record(event.clientX, event.clientY);
			const over = cellAtPoint(event.clientX, event.clientY);

			// Dropped on a legal empty cell — that's the move, however the user
			// got here (dragged onto it, or clicked it with a tile selected).
			if (over !== null && !imageByIndex.has(over)) {
				commit(selected, over);
				return;
			}

			const press = pressRef.current;
			// A second press on the already-selected tile puts it back down.
			if (press && !press.moved && press.wasSelected && over === press.index) {
				clearSelection();
				return;
			}
			// A real drag that ended nowhere useful cancels; a press that never
			// moved leaves the tile selected so the user can finish with a
			// second tap. That second path is the only workable one on touch,
			// where there is no cursor to drag under.
			if (press?.moved) {
				clearSelection();
				return;
			}
			setCarry(null);
			setHoveredCell(null);
		},
		[cellAtPoint, clearSelection, commit, imageByIndex, record, selected],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			if (submitting || placed) return;
			const occupied = imageByIndex.has(index);
			if (occupied) {
				if (selected === index) {
					clearSelection();
					return;
				}
				if (selected === null) {
					interactionStartedAt.current = Date.now();
					events.current = [];
				}
				setSelected(index);
				return;
			}
			if (selected !== null) commit(selected, index);
		},
		[clearSelection, commit, imageByIndex, placed, selected, submitting],
	);

	const carriedImage =
		selected !== null ? imageByIndex.get(selected) : undefined;
	const placedImage = placed ? imageByIndex.get(placed.from) : undefined;

	const cellStyle = (index: number, occupied: boolean): React.CSSProperties => {
		const isSelected = selected === index;
		const isDropTarget = hoveredCell === index;
		const isPlacedTarget = placed?.to === index;
		const isPlacedSource = placed?.from === index;

		const ring = isPlacedTarget
			? `0 0 0 2px ${theme.palette.connect.solvedRing}`
			: isDropTarget
				? `0 0 0 2px ${theme.palette.connect.dropRing}`
				: isSelected
					? `0 0 0 2px ${theme.palette.connect.selectedRing}`
					: occupied
						? "none"
						: `inset 0 0 0 1px ${theme.palette.connect.cellBorder}`;

		return {
			position: "relative",
			width: `${cell}px`,
			height: `${cell}px`,
			borderRadius: `${Math.round(cell * 0.26)}px`,
			boxSizing: "border-box",
			background: occupied
				? "transparent"
				: isPlacedTarget
					? theme.palette.connect.solvedFill
					: isDropTarget
						? theme.palette.connect.dropFill
						: theme.palette.connect.cellFill,
			boxShadow: ring,
			cursor: submitting || placed ? "default" : occupied ? "grab" : "pointer",
			// Without this a touch-drag on a zoomed viewport is claimed by the
			// browser as a pan gesture before pointermove ever reaches us, and
			// the page scrolls instead of the tile moving.
			touchAction: "none",
			userSelect: "none",
			outline: "none",
			transition:
				"background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, opacity 0.18s ease",
			transform: isPlacedSource ? "scale(0.86)" : "scale(1)",
			opacity: isPlacedSource ? 0.2 : 1,
		};
	};

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
			<style>{KEYFRAMES}</style>

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
					animation: shaking ? "prosopo-connect-shake 0.5s ease" : "none",
				}}
			>
				<div
					style={{
						backgroundColor: theme.palette.surface,
						borderRadius: "20px 20px 0 0",
						padding: "12px 20px",
						width: `${boardPx}px`,
						boxSizing: "border-box",
						textAlign: "center",
						fontFamily: theme.font.fontFamily,
						fontSize: "14px",
						fontWeight: 500,
						lineHeight: 1.35,
						color: showRetry
							? theme.palette.error.main
							: theme.palette.onSurface,
						borderBottom: `2px solid ${
							showRetry ? theme.palette.error.main : "transparent"
						}`,
						transition: "color 0.3s ease, border-color 0.3s ease",
					}}
				>
					{showRetry ? retryText : instruction}
				</div>

				<div
					ref={boardRef}
					// biome-ignore lint/a11y/useSemanticElements: a board of drop
					// targets has no HTML equivalent; role="grid" is the correct mapping
					role="grid"
					aria-label={instruction}
					aria-rowcount={boardSize}
					aria-colcount={boardSize}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					// A pointer that leaves the window mid-drag never delivers
					// pointerup; without this the tile stays stuck to the cursor.
					onPointerCancel={clearSelection}
					style={{
						position: "relative",
						display: "grid",
						gridTemplateColumns: `repeat(${boardSize}, ${cell}px)`,
						gap: `${CELL_GAP_PX}px`,
						padding: `${BOARD_PADDING_PX}px`,
						width: `${boardPx}px`,
						boxSizing: "border-box",
						background: theme.palette.connect.boardBackground,
						borderRadius: "0 0 20px 20px",
						opacity: submitting ? 0.6 : 1,
						pointerEvents: submitting ? "none" : "auto",
						transition: "opacity 0.2s ease",
						touchAction: "none",
					}}
				>
					{cellIndices.map((index) => {
						const image = imageByIndex.get(index);
						const occupied = image !== undefined;
						const row = Math.floor(index / boardSize) + 1;
						const col = (index % boardSize) + 1;
						// The tile under the cursor is drawn following the
						// pointer instead of sitting in its cell.
						const lifted = carry !== null && selected === index;
						return (
							<div
								key={index}
								// biome-ignore lint/a11y/useSemanticElements: see the
								// role="grid" note above
								role="gridcell"
								aria-label={
									occupied
										? `Tile, row ${row} column ${col}`
										: `Empty space, row ${row} column ${col}`
								}
								aria-selected={selected === index}
								tabIndex={submitting || placed ? -1 : 0}
								// Test-only selector, constant-folded out of
								// production bundles. A stable hook on the cells
								// would hand a scripted solver the board geometry
								// for free; Cypress builds with
								// NODE_ENV=development so it is present under test.
								{...(process.env.NODE_ENV !== "production" && {
									"data-cy": occupied
										? `prosopo-connect-tile-${index}`
										: `prosopo-connect-cell-${index}`,
								})}
								onPointerDown={(event) => handlePointerDown(event, index)}
								onKeyDown={(event) => handleKeyDown(event, index)}
								style={cellStyle(index, occupied)}
							>
								{occupied && !lifted && (
									<img
										src={image}
										alt=""
										draggable={false}
										style={{
											width: "100%",
											height: "100%",
											display: "block",
											pointerEvents: "none",
											userSelect: "none",
											animation: "prosopo-connect-rise 0.25s ease both",
											filter:
												selected === index
													? "drop-shadow(0 4px 10px rgba(0,0,0,0.45))"
													: "drop-shadow(0 1px 3px rgba(0,0,0,0.28))",
											transform:
												selected === index ? "scale(1.06)" : "scale(1)",
											transition: "transform 0.18s ease, filter 0.18s ease",
										}}
									/>
								)}
								{hoveredCell === index && (
									<div
										style={{
											position: "absolute",
											inset: "24%",
											borderRadius: "50%",
											background: theme.palette.connect.dropRing,
											animation:
												"prosopo-connect-pulse 1.1s ease-in-out infinite",
											pointerEvents: "none",
										}}
									/>
								)}
							</div>
						);
					})}

					{/* The committed tile, drawn in its new cell while the submit
					    is in flight so the move reads as landing immediately. */}
					{placed && placedImage && (
						<img
							src={placedImage}
							alt=""
							draggable={false}
							style={{
								position: "absolute",
								left: `${BOARD_PADDING_PX + (placed.to % boardSize) * (cell + CELL_GAP_PX)}px`,
								top: `${BOARD_PADDING_PX + Math.floor(placed.to / boardSize) * (cell + CELL_GAP_PX)}px`,
								width: `${cell}px`,
								height: `${cell}px`,
								pointerEvents: "none",
								animation: "prosopo-connect-pop 0.4s ease both",
								filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
							}}
						/>
					)}
				</div>
			</div>

			{/* The carried tile, following the pointer. Rendered outside the card
			    and fixed so it floats above the board without being clipped. */}
			{carry && carriedImage && (
				<img
					src={carriedImage}
					alt=""
					draggable={false}
					style={{
						position: "fixed",
						left: `${carry.x - cell / 2}px`,
						top: `${carry.y - cell / 2}px`,
						width: `${cell}px`,
						height: `${cell}px`,
						pointerEvents: "none",
						zIndex: 2147483647,
						transform: "scale(1.12)",
						filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.5))",
					}}
				/>
			)}
		</div>
	);
};
