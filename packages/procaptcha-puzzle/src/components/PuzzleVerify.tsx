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

import { type ReactNode, memo, useEffect, useRef, useState } from "react";

interface VerifyResult {
	spliced: boolean;
	verified: boolean;
	left: number;
	destX: number;
}

interface VerifyProps {
	width?: number;
	height?: number;
	/** puzzle piece side length */
	l?: number;
	/** puzzle piece notch radius */
	r?: number;
	visible?: boolean;
	text?: string | ReactNode;
	refreshIcon?: string;
	/** Override image URL; if omitted the component uses the provided imgUrl prop */
	imgUrl?: string;
	/** Target X position supplied by the server challenge */
	serverDestX?: number;
	onDraw?: (left: number) => void;
	onSuccess?: (result: VerifyResult) => void;
	onFail?: VoidFunction;
	onRefresh?: VoidFunction;
}

function getRandomInt(min: number, max: number): number {
	return Math.round(Math.random() * (max - min) + min);
}

function sum(a: number, b: number): number {
	return a + b;
}

function square(x: number): number {
	return x * x;
}

const Verify = ({
	width = 320,
	height = 160,
	l = 42,
	r = 9,
	imgUrl,
	serverDestX,
	text = "Drag the puzzle piece to fill the gap",
	refreshIcon = "https://raw.githubusercontent.com/venkatmcajj/react-puzzle-captcha/master/docs/icon12.png",
	visible = true,
	onDraw,
	onSuccess,
	onFail,
	onRefresh,
}: VerifyProps) => {
	const PI = Math.PI;
	/** Actual slider piece width (l + notch diameter + padding) */
	const L = l + r * 2 + 3;

	const [isLoading, setLoading] = useState(false);
	const [textTip, setTextTip] = useState<string | ReactNode>(text);
	// Position of the puzzle piece
	const [pieceX, setPieceX] = useState(0);
	const [pieceY, setPieceY] = useState(0);

	// biome-ignore lint/suspicious/noExplicitAny: canvas ref
	const canvasRef = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: block canvas ref
	const blockRef = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: img ref
	const imgRef = useRef<any>(null);
	const isMouseDownRef = useRef(false);
	const trailRef = useRef<number[]>([]);
	const originXRef = useRef(0);
	const originYRef = useRef(0);
	const dragStartXRef = useRef(0);
	const dragStartYRef = useRef(0);
	const xRef = useRef(0);
	const yRef = useRef(0);

	const drawPath = (
		// biome-ignore lint/suspicious/noExplicitAny: canvas context
		ctx: any,
		x: number,
		y: number,
		operation: "fill" | "clip",
	) => {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
		ctx.lineTo(x + l, y);
		ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI);
		ctx.lineTo(x + l, y + l);
		ctx.lineTo(x, y + l);
		ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true);
		ctx.lineTo(x, y);
		ctx.lineWidth = 2;
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
		ctx.stroke();
		ctx.globalCompositeOperation = "destination-over";
		if (operation === "fill") {
			ctx.fill();
		} else {
			ctx.clip();
		}
	};

	const createImg = (onload: VoidFunction) => {
		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.onload = onload;
		img.onerror = () => {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic method
			(img as any).setSrc(imgUrl || "");
		};
		// biome-ignore lint/suspicious/noExplicitAny: dynamic method
		(img as any).setSrc = (src: string) => {
			img.src = src;
		};
		// biome-ignore lint/suspicious/noExplicitAny: dynamic method
		(img as any).setSrc(imgUrl || "");
		return img;
	};

	const draw = (img: HTMLImageElement) => {
		const canvasCtx = canvasRef.current.getContext("2d");
		const blockCtx = blockRef.current.getContext("2d");
		// Use server-supplied destX if provided, otherwise random
		xRef.current = serverDestX ?? getRandomInt(L + 10, width - (L + 10));
		yRef.current = getRandomInt(10 + r * 2, height - (L + 10));
		drawPath(canvasCtx, xRef.current, yRef.current, "fill");
		drawPath(blockCtx, xRef.current, yRef.current, "clip");
		canvasCtx.drawImage(img, 0, 0, width, height);
		blockCtx.drawImage(img, 0, 0, width, height);
		const y1 = yRef.current - r * 2 - 1;
		const imageData = blockCtx.getImageData(xRef.current - 3, y1, L, L);
		blockRef.current.width = L;
		blockRef.current.height = L;
		blockCtx.putImageData(imageData, 0, 0);
	};

	const initImg = () => {
		const img = createImg(() => {
			setLoading(false);
			draw(img);
		});
		imgRef.current = img;
	};

	const reset = () => {
		const canvasCtx = canvasRef.current.getContext("2d");
		const blockCtx = blockRef.current.getContext("2d");
		setPieceX(0);
		setPieceY(0);
		blockRef.current.width = width;
		blockRef.current.style.left = "0px";
		blockRef.current.style.top = "0px";
		trailRef.current = [];
		canvasCtx.clearRect(0, 0, width, height);
		blockCtx.clearRect(0, 0, width, height);
		setLoading(true);
		// biome-ignore lint/suspicious/noExplicitAny: dynamic method
		(imgRef.current as any)?.setSrc(imgUrl || "");
	};

	const handleRefresh = () => {
		reset();
		onRefresh?.();
	};

	const verify = (): VerifyResult => {
		const arr = trailRef.current;
		const average = arr.length > 0 ? arr.reduce(sum) / arr.length : 0;
		const deviations = arr.map((v) => v - average);
		const stddev =
			arr.length > 0
				? Math.sqrt(deviations.map(square).reduce(sum) / arr.length)
				: 0;
		// Check if piece is positioned correctly (within tolerance of target position)
		// The piece should be positioned where the image data was extracted from
		const targetX = xRef.current - 3; // Image data starts at xRef - 3
		const targetY = yRef.current - r * 2 - 1; // Same as y1 in draw function
		const tolerance = 15; // pixels tolerance for correct placement
		const distanceX = Math.abs(pieceX - targetX);
		const distanceY = Math.abs(pieceY - targetY);
		const spliced = distanceX < tolerance && distanceY < tolerance;

		return {
			spliced,
			verified: stddev !== 0,
			left: pieceX,
			destX: xRef.current,
		};
	};

	// biome-ignore lint/suspicious/noExplicitAny: event
	const handleDragStart = (e: any) => {
		e.preventDefault();
		originXRef.current = e.clientX ?? e.touches[0].clientX;
		originYRef.current = e.clientY ?? e.touches[0].clientY;
		dragStartXRef.current = pieceX;
		dragStartYRef.current = pieceY;
		isMouseDownRef.current = true;
	};

	// biome-ignore lint/suspicious/noExplicitAny: event
	const handleDragMove = (e: any) => {
		if (!isMouseDownRef.current) return;
		e.preventDefault();
		const eventX = e.clientX ?? e.touches[0].clientX;
		const eventY = e.clientY ?? e.touches[0].clientY;
		const deltaX = eventX - originXRef.current;
		const deltaY = eventY - originYRef.current;

		const newX = dragStartXRef.current + deltaX;
		const newY = dragStartYRef.current + deltaY;

		// Allow free movement within reasonable bounds
		setPieceX(Math.max(-50, Math.min(newX, width - L + 50)));
		setPieceY(Math.max(-50, Math.min(newY, height - L + 50)));

		trailRef.current.push(deltaY);
		onDraw?.(pieceX);
	};

	// biome-ignore lint/suspicious/noExplicitAny: event
	const handleDragEnd = (e: any) => {
		if (!isMouseDownRef.current) return;
		isMouseDownRef.current = false;

		const result = verify();
		if (result.spliced) {
			if (result.verified) {
				setTextTip("Perfect! Puzzle completed!");
				// Snap to exact position
				const snapX = xRef.current - 3;
				const snapY = yRef.current - r * 2 - 1;
				setPieceX(snapX);
				setPieceY(snapY);
				blockRef.current.style.left = `${snapX}px`;
				blockRef.current.style.top = `${snapY}px`;
				setTimeout(() => onSuccess?.(result), 500);
			} else {
				setTextTip("Almost there! Keep trying.");
				setTimeout(() => reset(), 1500);
			}
		} else {
			setTextTip("Not quite right. Try again!");
			setTimeout(() => reset(), 1500);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: imgUrl changes trigger re-draw
	useEffect(() => {
		if (visible) {
			imgRef.current ? reset() : initImg();
		}
	}, [visible, imgUrl]);

	// Update DOM position when piece position changes
	useEffect(() => {
		if (blockRef.current) {
			blockRef.current.style.left = `${pieceX}px`;
			blockRef.current.style.top = `${pieceY}px`;
		}
	}, [pieceX, pieceY]);

	return (
		<div
			className="verifyWrap"
			style={{
				width: `${width}px`,
				margin: "0 auto",
				display: visible ? "" : "none",
			}}
			onMouseMove={handleDragMove}
			onMouseUp={handleDragEnd}
			onTouchMove={handleDragMove}
			onTouchEnd={handleDragEnd}
		>
			<div className="canvasArea" style={{ position: "relative" }}>
				<canvas ref={canvasRef} width={width} height={height} />
				<canvas
					ref={blockRef}
					className="block"
					width={width}
					height={height}
					style={{
						position: "absolute",
						left: `${pieceX}px`,
						top: `${pieceY}px`,
						cursor: "move",
						zIndex: 10,
					}}
					onMouseDown={handleDragStart}
					onTouchStart={handleDragStart}
				/>
			</div>
			<div
				className="instructionText"
				style={{
					width: `${width}px`,
					textAlign: "center",
					padding: "10px",
					fontSize: "14px",
					color: "#666",
				}}
			>
				{textTip}
			</div>
			<div
				className="refreshIcon"
				onClick={handleRefresh}
				style={{ backgroundImage: `url(${refreshIcon})` }}
			/>
			<div
				className="loadingContainer"
				style={{
					width: `${width}px`,
					height: `${height}px`,
					display: isLoading ? "" : "none",
				}}
			>
				<div className="loadingIcon" />
				<span>Loading...</span>
			</div>
		</div>
	);
};

export default memo(Verify);
export type { VerifyResult, VerifyProps };
