// Copyright 2021-2025 Prosopo (UK) Ltd.
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

/** @jsxImportSource @emotion/react */

import { css, keyframes } from "@emotion/react";
import { loadI18next, useTranslation } from "@prosopo/locale";
import { Checkbox, useProcaptcha } from "@prosopo/procaptcha-common";
import {
	type MouseMovement,
	ProcaptchaConfigSchema,
	type ProcaptchaProps,
	type ProcaptchaSliderState,
	type ProcaptchaSliderStateUpdateFn,
	type SliderCaptchaResponseBody,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";
import Modal from "./Modal.js";

// Define the same event name as in the bundle
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

// Get a random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper functions for math calculations
const sum = (x: number, y: number) => x + y;
const square = (x: number) => x * x;

// Animation keyframes
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(72, 108, 214, 0.5); }
  50% { box-shadow: 0 0 15px rgba(72, 108, 214, 0.8); }
  100% { box-shadow: 0 0 5px rgba(72, 108, 214, 0.5); }
`;

const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const slideInAnimation = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

// Modern color palette
const colors = {
	primary: "#4361ee",
	primaryLight: "#4895ef",
	primaryDark: "#3f37c9",
	success: "#4cc9f0",
	successLight: "#4cc9f0",
	successDark: "#4361ee",
	error: "#f72585",
	errorLight: "#f72585",
	errorDark: "#b5179e",
	background: "#f8f9fa",
	backgroundDark: "#e9ecef",
	text: "#212529",
	textLight: "#495057",
	cardBg: "#ffffff",
	border: "#dee2e6",
	secondary: "#6c757d",
	secondaryLight: "#f8f9fa",
};

// Add styles for slider and puzzle captcha
const styles = {
	container: css`
		width: 320px;
		margin: 0 auto;
		position: relative;
		font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
		animation: ${slideInAnimation} 0.3s ease-out;
		background: ${colors.cardBg};
		border-radius: 12px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		margin-bottom: 15px;
	`,
	canvasContainer: css`
		position: relative;
		width: 320px;
		height: 160px;
		background-color: ${colors.backgroundDark};
		overflow: hidden;
		transition: all 0.3s ease;
		border-bottom: 1px solid ${colors.border};
		
		&:hover {
			transform: translateY(-1px);
		}
	`,
	canvas: css`
		position: absolute;
		top: 0;
		left: 0;
	`,
	block: css`
		position: absolute;
		left: 0;
		top: 0;
		cursor: pointer;
		cursor: grab;
		z-index: 10;
		will-change: transform;
		filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2));
		transition: filter 0.2s ease;
		
		&:active {
			cursor: grabbing;
			filter: drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.3));
		}
	`,
	refreshIcon: css`
		position: absolute;
		right: 10px;
		top: 10px;
		width: 36px;
		height: 36px;
		background-color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 15;
		font-size: 18px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		color: ${colors.primary};
		transition: all 0.2s ease;
		
		&:hover {
			background-color: #ffffff;
			box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
			transform: rotate(15deg);
			color: ${colors.primaryDark};
		}
	`,
	sliderContainer: css`
		position: relative;
		width: 320px;
		height: 40px;
		background-color: ${colors.background};
		margin: 0;
		overflow: hidden;
		box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
		transition: all 0.3s ease;
		border-bottom-left-radius: 12px;
		border-bottom-right-radius: 12px;
		
		&.success {
			background-color: rgba(40, 167, 69, 0.15);
		}
		
		&.error {
			background-color: rgba(220, 53, 69, 0.15);
		}
	`,
	sliderMask: css`
		position: absolute;
		left: 0;
		top: 0;
		height: 40px;
		border: 0 solid ${colors.primary};
		background: ${colors.primary}20;
		border-bottom-left-radius: 12px;
		transition: width 0.1s ease;
		z-index: 1;
	`,
	slider: css`
		position: relative;
		width: 320px;
		height: 40px;
		background-color: ${colors.secondaryLight};
		border-radius: 20px;
		margin-top: 10px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		user-select: none;
		overflow: hidden;
		transition: all 0.3s ease;
		
		&:hover {
			background-color: ${colors.secondary}15;
		}
	`,
	sliderProgress: css`
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 0%; /* Will be updated dynamically via inline style */
		background: ${colors.primary}20;
		border-bottom-left-radius: 12px;
		transition: width 0.3s ease;
		z-index: 1;
	`,
	sliderText: css`
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: ${colors.textLight};
		z-index: 1;
		pointer-events: none;
		user-select: none;
		text-align: center;
		font-weight: 500;
		letter-spacing: 0.2px;
	`,
	loadingOverlay: css`
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 20;
		border-radius: 12px;
		backdrop-filter: blur(4px);
		transition: all 0.3s ease;
	`,
	loadingSpinner: css`
		width: 48px;
		height: 48px;
		border: 3px solid rgba(67, 97, 238, 0.2);
		border-top: 3px solid ${colors.primary};
		border-radius: 50%;
		animation: ${spinAnimation} 1s cubic-bezier(0.56, 0.52, 0.17, 0.98) infinite;
		margin-bottom: 10px;
	`,
	loadingText: css`
		font-size: 14px;
		color: ${colors.primary};
		font-weight: 500;
		letter-spacing: 0.5px;
	`,
	title: css`
		font-size: 16px;
		font-weight: 600;
		color: ${colors.text};
		text-align: center;
		padding: 15px;
		background: ${colors.background};
		border-bottom: 1px solid ${colors.border};
		margin: 0;
	`,
	instruction: css`
		font-size: 14px;
		font-weight: 500;
		color: ${colors.textLight};
		text-align: center;
		padding: 10px;
		background: ${colors.backgroundDark};
		border-bottom: 1px solid ${colors.border};
		margin: 0;
	`,
	successIcon: css`
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: ${colors.success};
		font-size: 60px;
		opacity: 0;
		z-index: 25;
		transition: opacity 0.3s ease;
		animation: ${pulseAnimation} 0.6s ease-in-out;
		
		&.show {
			opacity: 1;
		}
	`,
	sliderHandle: css`
		position: absolute;
		top: 0;
		left: 0;
		width: 40px;
		height: 40px;
		background: white;
		border-radius: 0 0 12px 12px;
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: grab;
		z-index: 2;
		transition: all 0.2s ease;
		
		&:hover {
			box-shadow: 0 6px 14px rgba(67, 97, 238, 0.25), 0 2px 6px rgba(67, 97, 238, 0.1);
			transform: translateY(-1px);
		}
		
		&:active {
			cursor: grabbing;
			transform: scale(0.98);
			box-shadow: 0 2px 6px rgba(67, 97, 238, 0.2);
		}
		
		&:after {
			content: "";
			display: block;
			width: 16px;
			height: 2px;
			background: ${colors.primary};
			border-radius: 1px;
			margin-top: -4px;
			transition: all 0.2s ease;
		}
		
		&:hover:after {
			background: ${colors.primaryDark};
			width: 18px;
		}
	`,
	closeButton: css`
		position: absolute;
		right: 10px;
		top: 10px;
		width: 36px;
		height: 36px;
		background-color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 15;
		font-size: 20px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		color: ${colors.error};
		transition: all 0.2s ease;
		
		&:hover {
			background-color: #ffffff;
			box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
			transform: rotate(90deg);
			color: ${colors.errorDark};
		}
	`,
	tempSubmitButton: css`
		width: 320px;
		padding: 10px;
		margin: 15px auto 0;
		background-color: #ff6b6b;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: bold;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		display: block;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		
		&:before {
			content: "DEV";
			position: absolute;
			top: 0;
			right: 0;
			background: #ff4757;
			color: white;
			padding: 2px 6px;
			font-size: 10px;
			border-radius: 0 8px 0 8px;
		}
		
		&:hover {
			background-color: #ff5252;
			transform: translateY(-1px);
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
		}
		
		&:active {
			transform: scale(0.98);
		}
	`,
	modalContent: css`
		display: flex;
		flex-direction: column;
		align-items: center;
	`,
};

// Define custom CSS class strings for slider states
const sliderActiveClass = `
.sliderContainer_active .slider {
	box-shadow: 0 4px 8px rgba(67, 97, 238, 0.25);
	animation: ${glowAnimation} 1.5s ease-in-out infinite;
}
.sliderContainer_active .slider:after {
	background: ${colors.primaryDark};
}
.sliderContainer_active:before {
	opacity: 0;
}
`;

const sliderSuccessClass = `
.sliderContainer_success {
	border: 1px solid ${colors.success};
}
.sliderContainer_success:before {
	content: "Verification successful!";
	color: ${colors.success};
	font-weight: 600;
	opacity: 1;
}
.sliderContainer_success .slider {
	background: ${colors.success};
	animation: ${pulseAnimation} 0.6s ease-in-out;
}
.sliderContainer_success .slider:after {
	background: white;
}
.sliderContainer_success .sliderMask {
	background: linear-gradient(90deg, ${colors.successLight}, ${colors.success});
	border: 0;
}
`;

const sliderFailClass = `
.sliderContainer_fail {
	border: 1px solid ${colors.error};
	animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
.sliderContainer_fail:before {
	content: "Try again";
	color: ${colors.error};
	font-weight: 600;
	opacity: 1;
}
.sliderContainer_fail .slider {
	background: ${colors.error};
}
.sliderContainer_fail .slider:after {
	background: white;
}
.sliderContainer_fail .sliderMask {
	background: linear-gradient(90deg, ${colors.errorLight}, ${colors.error});
	border: 0;
}
@keyframes shake {
	10%, 90% { transform: translateX(-1px); }
	20%, 80% { transform: translateX(2px); }
	30%, 50%, 70% { transform: translateX(-2px); }
	40%, 60% { transform: translateX(2px); }
}
`;

export const SliderCaptchaWidget = (props: ProcaptchaProps) => {
	const { t } = useTranslation();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState;
	const i18n = props.i18n;
	const callbacks = props.callbacks || {};
	const [baseState, updateBaseState] = useProcaptcha<SliderCaptchaResponseBody>(useState, useRef);
	const [loading, setLoading] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);

	// Create the full slider state
	const state: ProcaptchaSliderState = {
		...baseState,
		config,
		frictionlessState,
		i18n,
		callbacks,
		mouseMovements: [],
		attemptCount: 0,
		challenge: baseState.challenge,
	};

	const manager = Manager(
		config,
		state,
		updateBaseState,
		callbacks,
		frictionlessState,
	);
	const theme = "light" === state.config.theme ? lightTheme : darkTheme;

	// Puzzle captcha state
	const [sliderLeft, setSliderLeft] = useState(0);
	const [sliderClass, setSliderClass] = useState("sliderContainer");
	const [isVerified, setIsVerified] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFailed, setIsFailed] = useState(false);
	const [destX, setDestX] = useState(0);
	const [puzzleImage, setPuzzleImage] = useState("");
	const [showSuccessIcon, setShowSuccessIcon] = useState(false);

	// Canvas setup
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const blockRef = useRef<HTMLCanvasElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);
	const maskRef = useRef<HTMLDivElement>(null);
	const thumbRef = useRef<HTMLDivElement>(null);

	// Constants for puzzle piece
	const L = 42; // Puzzle piece size
	const R = 9; // Radius of the puzzle piece corners

	// Additional refs for tracking drag
	const isMouseDownRef = useRef<boolean>(false);
	const originXRef = useRef<number>(0);
	const originYRef = useRef<number>(0);
	const trailRef = useRef<number[]>([]);
	const xRef = useRef<number>(0);

	// Update type assertions for challenge
	const challenge = state.challenge as SliderCaptchaResponseBody;

	// Update image URL checks
	if (challenge?.imageUrl) {
		console.log(
			"[SliderCaptcha] Using server-provided image URL:",
			challenge.imageUrl,
		);
	}

	// Update to ensure the canvas is initialized when the modal shows
	useEffect(() => {
		if (state.showModal) {
			// Only initialize if we have a challenge
			if (state.challenge) {
				if (!canvasRef.current || !blockRef.current) {
					// Wait for refs to be available before initializing
					const checkInterval = setInterval(() => {
						if (canvasRef.current && blockRef.current) {
							clearInterval(checkInterval);
							resetPuzzle();
						}
					}, 50);

					// Clean up interval if modal closes
					return () => clearInterval(checkInterval);
				}
				resetPuzzle();
			}
			// Return empty cleanup function to satisfy TypeScript
			return () => {};
		}
		// Return empty cleanup function to satisfy TypeScript
		return () => {};
	}, [state.showModal, state.challenge]);

	// Add event listener for the execute event
	useEffect(() => {
		// Event handler for when execute() is called
		const handleExecuteEvent = (event: Event) => {
			// Show the modal
			updateBaseState({
				showModal: true,
			});
		};

		document.addEventListener(PROCAPTCHA_EXECUTE_EVENT, handleExecuteEvent);

		// Cleanup function to remove event listener
		return () => {
			document.removeEventListener(
				PROCAPTCHA_EXECUTE_EVENT,
				handleExecuteEvent,
			);
		};
	}, [updateBaseState]);

	const getRandomImage = () => {
		// Get a random image from picsum with CORS-friendly URL
		const imageId = getRandomInt(1, 1000);
		return `https://picsum.photos/id/${imageId}/320/160`;
	};

	// Add a maximum retry count for image loading
	const MAX_IMAGE_RETRIES = 3;

	// Modify the resetPuzzle function to not call manager.start()
	const resetPuzzle = useCallback(async () => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		// Reset all slider elements
		setSliderLeft(0);
		setSliderClass("sliderContainer");
		setIsVerified(false);
		setIsSuccess(false);
		setIsFailed(false);
		setShowSuccessIcon(false);
		trailRef.current = [];
		
		// Reset slider handle position
		if (thumbRef.current) {
			thumbRef.current.style.left = '0px';
		}
		
		// Reset block position
		if (blockRef.current) {
			blockRef.current.style.left = '0px';
		}
		
		// Reset mask width
		if (maskRef.current) {
			maskRef.current.style.width = '0px';
		}

		// Set loading state
		setImageLoading(true);

		try {
			// Use the current challenge instead of requesting a new one
			const challenge = state.challenge as SliderCaptchaResponseBody;
			if (!challenge) {
				console.error("No challenge available for puzzle reset");
				setImageLoading(false);
				return;
			}

			// Get target position using all possible formats
			let puzzleDestination: number;
			
			// Check for all possible target position formats
			if (typeof challenge.targetPosition === 'number') {
				// Simple number format
				puzzleDestination = challenge.targetPosition;
			} else if (challenge.targetPosition2D && typeof challenge.targetPosition2D.x === 'number') {
				// Object format with x/y coordinates
				puzzleDestination = challenge.targetPosition2D.x;
			} else if (challenge.targetPosition && typeof challenge.targetPosition === 'object' && 'x' in challenge.targetPosition) {
				// GetSliderCaptchaResponse format
				puzzleDestination = (challenge.targetPosition as {x: number, y: number}).x;
			} else {
				// Fallback to random position
				puzzleDestination = getRandomInt(20, 300);
			}

			// Check for shaped slider captcha (has baseImageUrl AND puzzlePieceUrl)
			if (challenge.baseImageUrl && challenge.puzzlePieceUrl) {
				console.log("[SliderCaptcha] Using shaped slider captcha");
				renderShapedSliderCaptcha(
					challenge.baseImageUrl,
					challenge.puzzlePieceUrl,
					puzzleDestination
				);
				return;
			}
			
			// If we have a server-provided image URL (legacy format), use it
			if (challenge.imageUrl) {
				const img = new Image();
				img.crossOrigin = "anonymous";
				img.onload = () => {
					drawPuzzleFromImage(img, puzzleDestination);
					setImageLoading(false);
				};
				img.onerror = () => {
					console.error(
						"Failed to load server image, falling back to client-side generation",
					);
					generateRandomImage(puzzleDestination);
				};
				img.src = challenge.imageUrl;
			} else {
				// Otherwise, generate a random image client-side
				generateRandomImage(puzzleDestination);
			}
		} catch (error) {
			console.error("Error resetting puzzle:", error);
			setImageLoading(false);
			// Fall back to client-side generation if provider request fails
			const puzzleDestination = getRandomInt(20, 300);
			generateRandomImage(puzzleDestination);
		}
	}, [canvasRef, blockRef, state.challenge]);

	// Add a function to draw puzzle from a pre-loaded image
	const drawPuzzleFromImage = (img: HTMLImageElement, destination: number) => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const block = blockRef.current;
		const ctx = canvas.getContext("2d");
		const blockCtx = block.getContext("2d");

		if (!ctx || !blockCtx) {
			return;
		}

		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;

		// Clear canvas
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		blockCtx.clearRect(0, 0, block.width, block.height);

		try {
			// Draw the image on the canvas with proper scaling
			ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

			// Generate the puzzle piece at the target position
			const blockX = destination;
			const blockY = Math.random() * (canvasHeight - 60) + 10;

			// Store the current destination and block position
			setDestX(destination);
			xRef.current = destination;
			setPuzzleImage(getRandomImage());

			// Draw the puzzle piece shape
			drawPuzzlePiece(ctx, blockX, blockY, "fill"); 
			drawPuzzlePiece(blockCtx, blockX, blockY, "clip");

			// Create a puzzle piece and cut it out of the canvas
			blockCtx.drawImage(canvas, 0, 0, canvasWidth, canvasHeight);
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(blockX, blockY, 40, 40);
			
			// Get the puzzle piece image data and place it at the left
			const imageData = blockCtx.getImageData(
				blockX - R, 
				blockY - R * 2,
				L + R * 2,
				L + R * 2
			);
			blockCtx.clearRect(0, 0, canvasWidth, canvasHeight);
			block.width = L + R * 2;
			blockCtx.putImageData(imageData, 0, blockY - R * 2);
		} catch (error) {
			console.error("CORS error with canvas:", error);
			// Fall back to a simpler approach without getImageData
			setImageLoading(false);
			
			// Create a solid color puzzle piece instead
			ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
			
			// Generate random block position
			const blockX = destination;
			const blockY = 80;
			
			// Store the destination
			setDestX(destination);
			xRef.current = destination;
			
			// Draw a visible target area instead of trying to extract image data
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
			ctx.fillRect(blockX, blockY, 40, 40);
			
			// Draw a solid color block for the puzzle piece
			blockCtx.clearRect(0, 0, block.width, block.height);
			block.width = 40;
			block.height = 40;
			blockCtx.fillStyle = "rgba(67, 97, 238, 0.8)";
			blockCtx.fillRect(0, 0, 40, 40);
			
			// Add a border to the block
			blockCtx.strokeStyle = "white";
			blockCtx.lineWidth = 2;
			blockCtx.strokeRect(0, 0, 40, 40);
		}

		// Reset slider position to start
		setSliderLeft(0);
		
		// Reset block position to the left
		if (blockRef.current) {
			blockRef.current.style.left = '0px';
		}
	}

	// Add a function to generate a random image when there's no server-provided one
	const generateRandomImage = (destination: number, retryCount = 0) => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		// If we've exceeded max retries, stop trying
		if (retryCount >= MAX_IMAGE_RETRIES) {
			console.error("Max image loading retries reached");
			setImageLoading(false);
			return;
		}

		const canvas = canvasRef.current;
		const block = blockRef.current;
		const ctx = canvas.getContext("2d");
		const blockCtx = block.getContext("2d");

		if (!ctx || !blockCtx) {
			return;
		}

		// Reset slider state
		setSliderLeft(0);
		setSliderClass("sliderContainer");
		setIsVerified(false);
		setIsSuccess(false);
		setIsFailed(false);
		setShowSuccessIcon(false);
		trailRef.current = [];

		// Reset block position to the left
		if (blockRef.current) {
			blockRef.current.style.left = '0px';
		}

		// Store the destination value
		setDestX(destination);
		xRef.current = destination;

		// Set a new random image
		setPuzzleImage(getRandomImage());

		// Draw the image onto the canvas once it's loaded
		const img = new Image();
		img.crossOrigin = "anonymous"; // Important for CORS

		img.onload = () => {
			try {
				// Draw main image
				ctx.drawImage(img, 0, 0, 320, 160);

				// Draw the puzzle piece shape
				drawPuzzlePiece(ctx, destination, 80, "fill");
				drawPuzzlePiece(blockCtx, destination, 80, "clip");

				// Draw the image on the block canvas
				blockCtx.drawImage(img, 0, 0, 320, 160);

				// Get the puzzle piece image data and place it at the left
				const imageData = blockCtx.getImageData(
					destination - R,
					80 - R * 2,
					L + R * 2,
					L + R * 2,
				);
				blockCtx.clearRect(0, 0, 320, 160);
				block.width = L + R * 2;
				blockCtx.putImageData(imageData, 0, 80 - R * 2);
			} catch (error) {
				console.error("CORS error in generateRandomImage:", error);
				
				// Fall back to solid color if we get a CORS error
				ctx.drawImage(img, 0, 0, 320, 160);
				
				// Draw a visible target area
				ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
				ctx.fillRect(destination, 80, 40, 40);
				
				// Create a solid color block for the puzzle piece
				blockCtx.clearRect(0, 0, block.width, block.height);
				block.width = 40;
				block.height = 40;
				blockCtx.fillStyle = "rgba(67, 97, 238, 0.8)";
				blockCtx.fillRect(0, 0, 40, 40);
				
				// Add a border to the block
				blockCtx.strokeStyle = "white";
				blockCtx.lineWidth = 2;
				blockCtx.strokeRect(0, 0, 40, 40);
			}

			// Hide loading state
			setImageLoading(false);
		};

		img.onerror = () => {
			// Handle image loading error by trying a different image
			console.error(`Failed to load image (attempt ${retryCount + 1}/${MAX_IMAGE_RETRIES}), trying another one`);
			setPuzzleImage(getRandomImage());
			// Pass the retry count to prevent infinite loops
			generateRandomImage(destination, retryCount + 1);
		};

		img.crossOrigin = "anonymous";
		img.src = puzzleImage;
	};

	// Draw the puzzle piece
	const drawPuzzlePiece = (
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		operation: "fill" | "clip",
	) => {
		const l = L; // side length
		const r = R; // radius
		const PI = Math.PI;

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

	const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
		if ("touches" in e && e.touches[0]) {
			originXRef.current = e.touches[0].clientX;
			originYRef.current = e.touches[0].clientY;
		} else if ("clientX" in e) {
			originXRef.current = e.clientX;
			originYRef.current = e.clientY;
		}
		isMouseDownRef.current = true;
		trailRef.current = []; // Reset trail
	};

	const handleDragMove = (e: MouseEvent | TouchEvent) => {
		if (!isMouseDownRef.current) return false;
		e.preventDefault();

		let eventX;
		let eventY;
		if ("touches" in e) {
			if (!e.touches[0]) return false;
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}

		const moveX = eventX - originXRef.current;
		const moveY = eventY - originYRef.current;

		// Limit movement within bounds (0 to 280 - slider handle width)
		const maxMove = Math.min(Math.max(moveX, 0), 280);
		
		// Update slider position
		setSliderLeft(maxMove);

		// Update block position to match slider movement (keep them synchronized)
		if (blockRef.current) {
			blockRef.current.style.left = `${maxMove}px`;
		}

		// Update slider appearance
		setSliderClass("sliderContainer sliderContainer_active");

		// Record Y movement for verification
		trailRef.current.push(moveY);

		// Track mouse movement in manager for verification
		manager.trackMouseMovement(eventX, eventY);

		return true;
	};

	const handleVerificationFailure = () => {
		console.error("[SliderCaptcha] Verification failed");
		setSliderClass("sliderContainer sliderContainer_fail");
		setIsFailed(true);

		// Reset after delay
		setTimeout(async () => {
			// First close the modal and reset all state
			handleCloseModal();
			
			// Small additional delay to ensure state is cleared
			setTimeout(() => {
				// Find and click the checkbox to start fresh
				const checkbox = document.querySelector('.slider-captcha input[type="checkbox"]') as HTMLInputElement;
				if (checkbox) {
					checkbox.click();
				} else {
					console.error("[SliderCaptcha] Could not find checkbox to restart verification");
				}
			}, 100);
		}, 1000);
	};

	const handleDragEnd = (e: MouseEvent | TouchEvent) => {
		if (!isMouseDownRef.current) return false;
		isMouseDownRef.current = false;

		// No movement case
		if (sliderLeft === 0) return false;

		setSliderClass("sliderContainer");

		// Get the target position from state or destX
		const targetPosition = state?.challenge?.targetPosition || destX;
		
		// Get the challenge ID from the state
		const challengeId = state?.challenge?.challengeId;

		if (!challengeId) {
			console.error("[SliderCaptcha] No challenge ID found in state");
			handleVerificationFailure();
			return false;
		}

		// Check if puzzle piece is in correct position (within 50px tolerance)
		const isInPosition = Math.abs(sliderLeft - targetPosition) <= 50;
		
		if (!isInPosition) {
			console.error("[SliderCaptcha] Puzzle piece not in correct position");
			handleVerificationFailure();
			return false;
		}

		// Submit to provider for verification
		console.log("[SliderCaptcha] Submitting solution to provider");

		// Always pass to manager for provider verification
		manager.onSuccess(sliderLeft, targetPosition).then((isVerified) => {
			if (isVerified) {
				// Server verified successfully
				setSliderClass("sliderContainer sliderContainer_success");
				setIsSuccess(true);
				setIsVerified(true);
				setShowSuccessIcon(true);
			} else {
				// Server rejected the verification
				handleVerificationFailure();
			}
		}).catch((error) => {
			console.error("[SliderCaptcha] Error submitting solution:", error);
			handleVerificationFailure();
		});

		return true;
	};

	// Remove separate mouse/touch event handlers and use container-level handling
	useEffect(() => {
		// Add event listeners to the document for drag events
		document.addEventListener("mousemove", handleDragMove);
		document.addEventListener("mouseup", handleDragEnd);
		document.addEventListener("touchmove", handleDragMove, { passive: false });
		document.addEventListener("touchend", handleDragEnd);

		// Cleanup function to remove event listeners
		return () => {
			document.removeEventListener("mousemove", handleDragMove);
			document.removeEventListener("mouseup", handleDragEnd);
			document.removeEventListener("touchmove", handleDragMove);
			document.removeEventListener("touchend", handleDragEnd);
		};
	}, []);

	// Add a CSS class for proper styling of the slider states
	useEffect(() => {
		const addSliderStyles = () => {
			// Add CSS for slider states if not already in document
			if (!document.getElementById("slider-captcha-styles")) {
				const styleEl = document.createElement("style");
				styleEl.id = "slider-captcha-styles";
				styleEl.textContent = `
					${sliderActiveClass}
					${sliderSuccessClass}
					${sliderFailClass}
					
					@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&display=swap');
				`;
				document.head.appendChild(styleEl);
			}
		};

		addSliderStyles();

		return () => {
			// Clean up styles when component unmounts
			const styleEl = document.getElementById("slider-captcha-styles");
			if (styleEl) {
				document.head.removeChild(styleEl);
			}
		};
	}, []);

	// Success icon component (checkmark)
	const SuccessIcon = () => (
		<div
			className={`success-icon ${showSuccessIcon ? "show" : ""}`}
			css={styles.successIcon}
			aria-hidden="true"
		>
			<svg
				width="60"
				height="60"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M8.79508 15.875L4.62508 11.705L3.20508 13.115L8.79508 18.705L20.7951 6.70504L19.3851 5.29504L8.79508 15.875Z"
					fill="currentColor"
				/>
			</svg>
		</div>
	);

	// Add close modal handler
	const handleCloseModal = useCallback(() => {
		// Reset all state
		setSliderLeft(0);
		setSliderClass("sliderContainer");
		setIsVerified(false);
		setIsSuccess(false);
		setIsFailed(false);
		setShowSuccessIcon(false);
		setImageLoading(false);
		trailRef.current = [];
		
		// Reset positions
		if (thumbRef.current) {
			thumbRef.current.style.left = '0px';
		}
		if (blockRef.current) {
			blockRef.current.style.left = '0px';
		}
		if (maskRef.current) {
			maskRef.current.style.width = '0px';
		}

		// Close the modal and reset state
		updateBaseState({
			showModal: false,
			isHuman: false,
			challenge: undefined,
			attemptCount: 0,
			error: undefined // Also clear any error state
		});
	}, [updateBaseState]);

	// Modify the puzzle piece rendering to support shaped pieces
	const handleChallengeUpdate = useCallback(() => {
		// Reset any verification state
		setIsVerified(false);
		setIsSuccess(false);
		setIsFailed(false);
		setShowSuccessIcon(false);
		
		setImageLoading(true);

		// Check if we have a server-provided challenge
		if (state.challenge) {
			// Check if this is a shaped slider captcha with pre-generated images
			if (state.challenge.baseImageUrl && state.challenge.puzzlePieceUrl) {
				console.log('[SliderCaptcha] Rendering shaped slider captcha');
				
				// We have pre-rendered base and puzzle piece images
				renderShapedSliderCaptcha(
					state.challenge.baseImageUrl,
					state.challenge.puzzlePieceUrl,
					state.challenge.targetPosition2D?.x || 
					state.challenge.targetPosition || 
					Math.floor(Math.random() * 280) + 20
				);
			} else if (state.challenge.imageUrl) {
				console.log('[SliderCaptcha] Rendering simple slider captcha');
				
				// Load the server-provided image
				const img = new Image();
				img.crossOrigin = "anonymous";
				img.onload = () => {
					// We have the challenge image, now draw the puzzle at the target position
					drawPuzzleFromImage(
						img, 
						state.challenge?.targetPosition || 
						Math.floor(Math.random() * 280) + 20
					);
					setImageLoading(false);
				};
				img.onerror = () => {
					console.error('[SliderCaptcha] Error loading challenge image');
					const puzzleDestination = getRandomInt(20, 300);
					generateRandomImage(puzzleDestination);
				};
				img.src = state.challenge.imageUrl;
			} else {
				console.log('[SliderCaptcha] No image provided in challenge, generating random one');
				// No image provided in the challenge, generate a random one
				const puzzleDestination = getRandomInt(20, 300);
				generateRandomImage(puzzleDestination);
			}
		} else {
			console.log('[SliderCaptcha] No challenge provided, generating random one');
			// No challenge provided, generate a random puzzle
			const puzzleDestination = getRandomInt(20, 300);
			generateRandomImage(puzzleDestination);
		}
	}, [canvasRef, blockRef, state.challenge]);

	// Add a function to render a pre-generated shaped slider captcha
	const renderShapedSliderCaptcha = (
		baseImageUrl: string,
		puzzlePieceUrl: string,
		targetPosition: number
	) => {
		if (!canvasRef.current || !blockRef.current) {
			console.error('[SliderCaptcha] Canvas or block not available');
			return;
		}

		// Load the base image
		const baseImage = new Image();
		baseImage.crossOrigin = "anonymous";
		
		// Load the puzzle piece image
		const puzzlePieceImage = new Image();
		puzzlePieceImage.crossOrigin = "anonymous";
		
		// Counter to track loaded images
		let imagesLoaded = 0;
		
		const checkAllImagesLoaded = () => {
			imagesLoaded++;
			if (imagesLoaded === 2) {
				completeRendering();
			}
		};
		
		const completeRendering = () => {
			const canvas = canvasRef.current;
			const block = blockRef.current;
			
			if (!canvas || !block) return;
			
			const ctx = canvas.getContext('2d');
			const blockCtx = block.getContext('2d');
			
			if (!ctx || !blockCtx) return;
			
			// Draw the base image on the canvas - always fit to canvas size
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
			
			// Store the target position
			setDestX(targetPosition);
			xRef.current = targetPosition;
			
			// Use the actual puzzle piece dimensions for the piece canvas
			// Make sure we don't exceed the original dimensions
			block.width = puzzlePieceImage.width;
			block.height = puzzlePieceImage.height;
			
			// Draw the puzzle piece without scaling
			blockCtx.clearRect(0, 0, block.width, block.height);
			blockCtx.drawImage(puzzlePieceImage, 0, 0);
			
			// Get the y position from the challenge data
			let targetY = 0;
			if (state.challenge?.targetPosition2D?.y !== undefined) {
				targetY = state.challenge.targetPosition2D.y;
			} else if (state.challenge?.targetPosition && typeof state.challenge.targetPosition === 'object' && 'y' in state.challenge.targetPosition) {
				targetY = (state.challenge.targetPosition as {x: number, y: number}).y;
			}
			
			// Set the vertical position of the puzzle piece
			if (block) {
				block.style.top = `${targetY}px`;
				console.log(`[SliderCaptcha] Setting puzzle piece Y position to ${targetY}px`);
			}
			
			// Log the dimensions for debugging
			console.log('[SliderCaptcha] Rendering with dimensions:', {
				baseImage: `${baseImage.width}x${baseImage.height} → ${canvas.width}x${canvas.height}`,
				puzzlePiece: `${puzzlePieceImage.width}x${puzzlePieceImage.height} (original size)`,
				position: { x: 0, y: targetY }
			});
			
			// Reset slider position
			setSliderLeft(0);
			if (blockRef.current) {
				blockRef.current.style.left = '0px';
			}
			
			// Hide loading state
			setImageLoading(false);
		};
		
		// Set up image loading handlers
		baseImage.onload = checkAllImagesLoaded;
		baseImage.onerror = () => {
			console.error('[SliderCaptcha] Failed to load base image, falling back to random image');
			generateRandomImage(targetPosition);
		};
		
		puzzlePieceImage.onload = checkAllImagesLoaded;
		puzzlePieceImage.onerror = () => {
			console.error('[SliderCaptcha] Failed to load puzzle piece image, falling back to random image');
			generateRandomImage(targetPosition);
		};
		
		// Start loading the images
		baseImage.src = baseImageUrl;
		puzzlePieceImage.src = puzzlePieceUrl;
	}

	if (config.mode === "invisible") {
		return (
			<Modal show={state.showModal}>
				<div css={styles.modalContent}>
					<div css={styles.container}>
						<div
							css={styles.closeButton}
							onClick={handleCloseModal}
							aria-label="Close verification"
						>
							×
						</div>
						<div css={styles.title}>Verify you are human</div>
						<div css={styles.instruction}>
							Drag the puzzle piece into position
						</div>

						<div css={styles.canvasContainer}>
							<canvas
								css={styles.canvas}
								ref={canvasRef}
								width="320"
								height="160"
							/>
							<canvas
								css={styles.block}
								ref={blockRef}
								className="block"
								width="320"
								height="160"
								onMouseDown={handleDragStart}
								onTouchStart={handleDragStart}
							/>
							{imageLoading && (
								<div css={styles.loadingOverlay}>
									<div css={styles.loadingSpinner} />
									<div css={styles.loadingText}>Loading puzzle...</div>
								</div>
							)}
							<div
								css={styles.refreshIcon}
								onClick={handleChallengeUpdate}
								aria-label="Refresh puzzle"
							>
								↻
							</div>
							{showSuccessIcon && <SuccessIcon />}
						</div>

						<div
							css={styles.sliderContainer}
							ref={sliderRef}
							className={sliderClass}
						>
							<div css={styles.sliderProgress} style={{ width: `${sliderLeft + 20}px` }} />
							<div
								css={styles.sliderMask}
								ref={maskRef}
								style={{ width: `${sliderLeft + 20}px` }}
							/>
							<div
								css={styles.sliderHandle}
								ref={thumbRef}
								style={{ left: `${sliderLeft}px` }}
								onMouseDown={handleDragStart}
								onTouchStart={handleDragStart}
							/>
							<div css={styles.sliderText}>
								{isSuccess ? 'Verification complete!' : isFailed ? 'Verification failed. Try again.' : 'Slide to verify'}
							</div>
						</div>
					</div>

					{/* Temp dev button now inside modal but outside main container */}
					<button 
						css={styles.tempSubmitButton}
						onClick={() => {
							const challenge = state?.challenge as SliderCaptchaResponseBody;
							const challengeId = challenge?.challengeId;

							if (!challengeId) {
								console.error("[SliderCaptcha] No challenge ID found in state");
								handleVerificationFailure();
								return;
							}

							// Get the target position depending on format
							let targetPosition: number;
							if (typeof challenge.targetPosition === 'number') {
								// Simple number format
								targetPosition = challenge.targetPosition;
							} else if (challenge.targetPosition2D && typeof challenge.targetPosition2D.x === 'number') {
								// Object format with x/y coordinates
								targetPosition = challenge.targetPosition2D.x;
							} else if (challenge.targetPosition && typeof challenge.targetPosition === 'object' && 'x' in challenge.targetPosition) {
								// GetSliderCaptchaResponse format
								targetPosition = (challenge.targetPosition as {x: number, y: number}).x;
							} else {
								// Fallback to the stored destX from rendered captcha
								targetPosition = destX;
							}

							// Check if puzzle piece is in correct position (within 50px tolerance)
							const isInPosition = Math.abs(sliderLeft - targetPosition) <= 50;
							
							if (!isInPosition) {
								console.error("[SliderCaptcha] Puzzle piece not in correct position");
								handleVerificationFailure();
								return;
							}

							// Submit to provider for verification
							console.log("[SliderCaptcha] Submitting solution to provider");

							// Always pass to manager for provider verification
							manager.onSuccess(sliderLeft, targetPosition).then((isVerified) => {
								if (isVerified) {
									// Server verified successfully
									setSliderClass("sliderContainer sliderContainer_success");
									setIsSuccess(true);
									setIsVerified(true);
									setShowSuccessIcon(true);
								} else {
									// Server rejected the verification
									handleVerificationFailure();
								}
							}).catch((error) => {
								console.error("[SliderCaptcha] Error submitting solution:", error);
								handleVerificationFailure();
							});
						}}
					>
						[TEMP DEV] Submit Slider Position
					</button>
				</div>
			</Modal>
		);
	}

	return (
		<div className={"slider-captcha"}>
			<Modal show={state.showModal}>
				<div css={styles.modalContent}>
					<div css={styles.container}>
						<div
							css={styles.closeButton}
							onClick={handleCloseModal}
							aria-label="Close verification"
						>
							×
						</div>
						<div css={styles.title}>Verify you are human</div>
						<div css={styles.instruction}>
							Drag the puzzle piece into position
						</div>

						<div css={styles.canvasContainer}>
							<canvas
								css={styles.canvas}
								ref={canvasRef}
								width="320"
								height="160"
							/>
							<canvas
								css={styles.block}
								ref={blockRef}
								className="block"
								width="320"
								height="160"
								onMouseDown={handleDragStart}
								onTouchStart={handleDragStart}
							/>
							{imageLoading && (
								<div css={styles.loadingOverlay}>
									<div css={styles.loadingSpinner} />
									<div css={styles.loadingText}>Loading puzzle...</div>
								</div>
							)}
							<div
								css={styles.refreshIcon}
								onClick={handleChallengeUpdate}
								aria-label="Refresh puzzle"
							>
								↻
							</div>
							{showSuccessIcon && <SuccessIcon />}
						</div>

						<div
							css={styles.sliderContainer}
							ref={sliderRef}
							className={sliderClass}
						>
							<div css={styles.sliderProgress} style={{ width: `${sliderLeft + 20}px` }} />
							<div
								css={styles.sliderMask}
								ref={maskRef}
								style={{ width: `${sliderLeft + 20}px` }}
							/>
							<div
								css={styles.sliderHandle}
								ref={thumbRef}
								style={{ left: `${sliderLeft}px` }}
								onMouseDown={handleDragStart}
								onTouchStart={handleDragStart}
							/>
							<div css={styles.sliderText}>
								{isSuccess ? 'Verification complete!' : isFailed ? 'Verification failed. Try again.' : 'Slide to verify'}
							</div>
						</div>
					</div>

					{/* Temp dev button now inside modal but outside main container */}
					<button 
						css={styles.tempSubmitButton}
						onClick={() => {
							const challenge = state?.challenge as SliderCaptchaResponseBody;
							const challengeId = challenge?.challengeId;

							if (!challengeId) {
								console.error("[SliderCaptcha] No challenge ID found in state");
								handleVerificationFailure();
								return;
							}

							// Get the target position depending on format
							let targetPosition: number;
							if (typeof challenge.targetPosition === 'number') {
								// Simple number format
								targetPosition = challenge.targetPosition;
							} else if (challenge.targetPosition2D && typeof challenge.targetPosition2D.x === 'number') {
								// Object format with x/y coordinates
								targetPosition = challenge.targetPosition2D.x;
							} else if (challenge.targetPosition && typeof challenge.targetPosition === 'object' && 'x' in challenge.targetPosition) {
								// GetSliderCaptchaResponse format
								targetPosition = (challenge.targetPosition as {x: number, y: number}).x;
							} else {
								// Fallback to the stored destX from rendered captcha
								targetPosition = destX;
							}

							// Check if puzzle piece is in correct position (within 50px tolerance)
							const isInPosition = Math.abs(sliderLeft - targetPosition) <= 50;
							
							if (!isInPosition) {
								console.error("[SliderCaptcha] Puzzle piece not in correct position");
								handleVerificationFailure();
								return;
							}

							// Submit to provider for verification
							console.log("[SliderCaptcha] Submitting solution to provider");

							// Always pass to manager for provider verification
							manager.onSuccess(sliderLeft, targetPosition).then((isVerified) => {
								if (isVerified) {
									// Server verified successfully
									setSliderClass("sliderContainer sliderContainer_success");
									setIsSuccess(true);
									setIsVerified(true);
									setShowSuccessIcon(true);
								} else {
									// Server rejected the verification
									handleVerificationFailure();
								}
							}).catch((error) => {
								console.error("[SliderCaptcha] Error submitting solution:", error);
								handleVerificationFailure();
							});
						}}
					>
						[TEMP DEV] Submit Slider Position
					</button>
				</div>
			</Modal>

			<Checkbox
				theme={theme}
				onChange={async () => {
					if (loading) {
						return;
					}
					setLoading(true);
					await manager.start();
					setLoading(false);
				}}
				checked={state.isHuman}
				labelText={t("WIDGET.I_AM_HUMAN")}
				error={
					typeof state.error === "object" &&
					state.error !== null &&
					"message" in state.error
						? (state.error as { message: string }).message
						: typeof state.error === "string"
							? state.error
							: undefined
				}
				aria-label="human checkbox"
				loading={loading}
			/>
		</div>
	);
};

export default SliderCaptchaWidget;
