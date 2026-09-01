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

import type { IconClick, IconOrderEvent } from "@prosopo/types";
import type { Theme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";

interface IconOrderCanvasProps {
	/** Frame with every icon composited into it, as a data URI. */
	background: string;
	/** Ordered legend strip on transparency, as a data URI. */
	legend: string;
	/** Edge length of one legend chip, in px. */
	legendIconSize: number;
	onComplete: (clicks: IconClick[], events: IconOrderEvent[]) => void;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
}

/**
 * Must match `DEFAULT_GEOMETRY` in @prosopo/icon-order-assets. Clicks are
 * reported in these coordinates, and the provider grades them against target
 * positions expressed in the same space, so the rendered frame is pinned to
 * its natural size rather than scaled to fit — a scaled frame would need the
 * factor applied to every click, and a mismatch would silently shift every
 * answer.
 */
const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

/** Radius of the numbered marker dropped on each click. */
const MARKER_RADIUS = 13;

const SHAKE_KEYFRAMES = `
@keyframes prosopo-icon-order-shake {
	0%, 100% { transform: translateX(0); }
	10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
	20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

export const IconOrderCanvas = ({
	background,
	legend,
	legendIconSize,
	onComplete,
	showRetry,
	submitting,
	theme,
}: IconOrderCanvasProps) => {
	const [clicks, setClicks] = useState<IconClick[]>([]);
	const events = useRef<IconOrderEvent[]>([]);
	const startedAt = useRef<number>(Date.now());
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [visible, setVisible] = useState(false);
	const [shaking, setShaking] = useState(false);

	// A new challenge arrives as new imagery, so clear the answer in progress
	// — otherwise the previous frame's clicks would be submitted against it.
	// The imagery is the dependency precisely because it is what identifies a
	// fresh challenge; the setters it calls are stable.
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the imagery, which is what identifies a fresh challenge
	useEffect(() => {
		setClicks([]);
		events.current = [];
		startedAt.current = Date.now();
	}, [background, legend]);

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
	 * Convert a pointer position into frame coordinates.
	 *
	 * Uses the element's measured box rather than the constants above, so a
	 * host page that has scaled the widget (a CSS transform on an ancestor,
	 * say) still reports clicks in the provider's coordinate space instead of
	 * silently offsetting every answer.
	 */
	const toFrameCoords = useCallback(
		(clientX: number, clientY: number): IconClick | null => {
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect || rect.width === 0 || rect.height === 0) return null;
			return {
				x: ((clientX - rect.left) / rect.width) * CONTAINER_WIDTH,
				y: ((clientY - rect.top) / rect.height) * CONTAINER_HEIGHT,
			};
		},
		[],
	);

	const recordEvent = useCallback((point: IconClick) => {
		events.current.push({
			x: point.x,
			y: point.y,
			// Relative to the challenge render, matching the puzzle type's
			// trail so behavioural analysis treats both the same way.
			t: Date.now() - startedAt.current,
		});
	}, []);

	const handlePointerMove = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (submitting) return;
			const point = toFrameCoords(event.clientX, event.clientY);
			if (point) recordEvent(point);
		},
		[submitting, toFrameCoords, recordEvent],
	);

	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (submitting) return;
			const point = toFrameCoords(event.clientX, event.clientY);
			if (!point) return;
			recordEvent(point);
			setClicks((current) => [...current, point]);
		},
		[submitting, toFrameCoords, recordEvent],
	);

	const handleTouchEnd = useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
			if (submitting) return;
			const touch = event.changedTouches[0];
			if (!touch) return;
			const point = toFrameCoords(touch.clientX, touch.clientY);
			if (!point) return;
			recordEvent(point);
			setClicks((current) => [...current, point]);
		},
		[submitting, toFrameCoords, recordEvent],
	);

	const reset = useCallback(() => {
		setClicks([]);
		events.current = [];
		startedAt.current = Date.now();
	}, []);

	const submit = useCallback(() => {
		if (submitting || clicks.length === 0) return;
		onComplete(clicks, events.current);
	}, [submitting, clicks, onComplete]);

	const instructionText = showRetry
		? "Not quite — try again"
		: "Select in this order";

	const headerBorderColor = showRetry
		? theme.palette.error.main
		: "transparent";
	const headerTextColor = showRetry
		? theme.palette.error.main
		: theme.palette.onSurface;

	// Tonal fallback shown before the server-rendered frame loads.
	const frameBg = `linear-gradient(135deg, ${theme.palette.surface} 0%, ${theme.palette.primaryContainer.main} 50%, ${theme.palette.surface} 100%)`;

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
			<style>{SHAKE_KEYFRAMES}</style>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					zIndex: 2147483647,
					opacity: visible ? 1 : 0,
					transform: visible ? "scale(1)" : "scale(0.9)",
					transition: "opacity 0.3s ease, transform 0.3s ease",
					animation: shaking ? "prosopo-icon-order-shake 0.5s ease" : "none",
				}}
			>
				{/* Header: instruction on the left, the ordered legend on the
				    right — the legend IS the instruction, so they sit on one
				    row the way the reference designs do. */}
				<div
					style={{
						backgroundColor: theme.palette.surface,
						borderRadius: "20px 20px 0 0",
						padding: "10px 16px",
						width: `${CONTAINER_WIDTH}px`,
						boxSizing: "border-box",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "10px",
						fontFamily: theme.font.fontFamily,
						fontSize: "14px",
						fontWeight: 500,
						color: headerTextColor,
						borderBottom: `2px solid ${headerBorderColor}`,
						transition: "color 0.3s ease, border-color 0.3s ease",
					}}
				>
					<span>{instructionText}</span>
					<img
						src={legend}
						alt="Icons to select, in order"
						draggable={false}
						style={{
							height: `${legendIconSize}px`,
							imageRendering: "auto",
							userSelect: "none",
						}}
					/>
				</div>

				{/* The frame. Every icon is already composited into these
				    pixels by the provider; the widget is never told where any
				    of them are, so nothing here can leak the answer. */}
				<div
					ref={containerRef}
					// Test-only selector — see the matching note on the puzzle
					// canvas. Gated on NODE_ENV so esbuild folds it out of
					// production bundles: a stable selector on the interactive
					// surface is exactly what a scripted solver wants.
					{...(process.env.NODE_ENV !== "production" && {
						"data-cy": "prosopo-icon-order-frame",
					})}
					onClick={handleClick}
					onMouseMove={handlePointerMove}
					onTouchEnd={handleTouchEnd}
					style={{
						position: "relative",
						width: `${CONTAINER_WIDTH}px`,
						height: `${CONTAINER_HEIGHT}px`,
						background: frameBg,
						overflow: "hidden",
						userSelect: "none",
						touchAction: "none",
						cursor: submitting ? "default" : "pointer",
						opacity: submitting ? 0.6 : 1,
						pointerEvents: submitting ? "none" : "auto",
						transition: "opacity 0.2s ease",
					}}
				>
					<img
						src={background}
						alt=""
						draggable={false}
						style={{
							position: "absolute",
							inset: 0,
							width: `${CONTAINER_WIDTH}px`,
							height: `${CONTAINER_HEIGHT}px`,
							pointerEvents: "none",
							userSelect: "none",
						}}
					/>

					{/* Numbered markers. The number is the whole point: the
					    user has to see the order they have committed to, since
					    that order is what is graded. */}
					{clicks.map((click, index) => (
						<div
							key={`${click.x.toFixed(1)}-${click.y.toFixed(1)}-${index}`}
							style={{
								position: "absolute",
								left: `${click.x - MARKER_RADIUS}px`,
								top: `${click.y - MARKER_RADIUS}px`,
								width: `${MARKER_RADIUS * 2}px`,
								height: `${MARKER_RADIUS * 2}px`,
								borderRadius: "50%",
								backgroundColor: theme.palette.primary.main,
								color: theme.palette.background.default,
								border: "2px solid rgba(255, 255, 255, 0.9)",
								boxShadow: "0 2px 6px rgba(0, 0, 0, 0.45)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontFamily: theme.font.fontFamily,
								fontSize: "12px",
								fontWeight: 700,
								pointerEvents: "none",
								userSelect: "none",
							}}
						>
							{index + 1}
						</div>
					))}
				</div>

				{/* Controls */}
				<div
					style={{
						backgroundColor: theme.palette.surface,
						borderRadius: "0 0 20px 20px",
						padding: "10px 16px",
						width: `${CONTAINER_WIDTH}px`,
						boxSizing: "border-box",
						display: "flex",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<button
						type="button"
						onClick={reset}
						disabled={submitting || clicks.length === 0}
						{...(process.env.NODE_ENV !== "production" && {
							"data-cy": "prosopo-icon-order-reset",
						})}
						style={{
							flex: "0 0 auto",
							padding: "8px 12px",
							borderRadius: "10px",
							border: `1px solid ${theme.palette.border}`,
							background: "transparent",
							color: theme.palette.onSurface,
							fontFamily: theme.font.fontFamily,
							fontSize: "13px",
							cursor: submitting || clicks.length === 0 ? "default" : "pointer",
							opacity: submitting || clicks.length === 0 ? 0.5 : 1,
						}}
					>
						Reset
					</button>
					<button
						type="button"
						onClick={submit}
						disabled={submitting || clicks.length === 0}
						{...(process.env.NODE_ENV !== "production" && {
							"data-cy": "prosopo-icon-order-submit",
						})}
						style={{
							flex: "1 1 auto",
							padding: "8px 12px",
							borderRadius: "10px",
							border: "none",
							backgroundColor: theme.palette.primary.main,
							color: theme.palette.background.default,
							fontFamily: theme.font.fontFamily,
							fontSize: "14px",
							fontWeight: 600,
							cursor: submitting || clicks.length === 0 ? "default" : "pointer",
							opacity: submitting || clicks.length === 0 ? 0.5 : 1,
						}}
					>
						{submitting ? "Checking…" : "OK"}
					</button>
				</div>
			</div>
		</div>
	);
};
