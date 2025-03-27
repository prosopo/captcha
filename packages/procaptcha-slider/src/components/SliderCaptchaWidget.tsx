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

import { loadI18next, useTranslation } from "@prosopo/locale";
import { Manager } from "../services/Manager.js";
import { Checkbox, useProcaptcha } from "@prosopo/procaptcha-common";
import { ProcaptchaConfigSchema, type ProcaptchaProps, type ProcaptchaSliderState, type ProcaptchaSliderStateUpdateFn, type SliderCaptchaResponseBody, type MouseMovement } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState, useCallback } from "react";
import Modal from "./Modal.js";
import { css, keyframes } from "@emotion/react";

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
	primary: '#4361ee',
	primaryLight: '#4895ef',
	primaryDark: '#3f37c9',
	success: '#4cc9f0',
	successLight: '#4cc9f0',
	successDark: '#4361ee',
	error: '#f72585',
	errorLight: '#f72585',
	errorDark: '#b5179e',
	background: '#f8f9fa',
	backgroundDark: '#e9ecef',
	text: '#212529',
	textLight: '#495057',
	cardBg: '#ffffff',
	border: '#dee2e6'
};

// Add styles for slider and puzzle captcha
const styles = {
	container: css`
		width: 320px;
		margin: 0 auto;
		position: relative;
		font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
		animation: ${slideInAnimation} 0.3s ease-out;
	`,
	canvasContainer: css`
		position: relative;
		width: 320px;
		height: 160px;
		background-color: ${colors.backgroundDark};
		overflow: hidden;
		border-radius: 12px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		margin-bottom: 15px;
		transition: all 0.3s ease;
		
		&:hover {
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
		}
	`,
	canvas: css`
		position: absolute;
		top: 0;
		left: 0;
		border-radius: 12px;
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
		text-align: center;
		width: 320px;
		height: 48px;
		line-height: 48px;
		background: ${colors.background};
		color: ${colors.textLight};
		border: 1px solid ${colors.border};
		border-radius: 24px;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		font-weight: 500;
		
		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}
		
		&:before {
			content: "Slide to solve puzzle";
			position: absolute;
			width: 100%;
			text-align: center;
			font-size: 14px;
			color: ${colors.textLight};
			z-index: 1;
			opacity: 0.8;
			font-weight: 500;
		}
	`,
	sliderMask: css`
		position: absolute;
		left: 0;
		top: 0;
		height: 48px;
		border: 0 solid ${colors.primary};
		background: linear-gradient(90deg, ${colors.primaryLight}, ${colors.primary});
		border-radius: 24px 0 0 24px;
		transition: width 0.1s ease;
	`,
	slider: css`
		position: absolute;
		top: 4px;
		left: 0;
		width: 40px;
		height: 40px;
		background: #ffffff;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transition: background 0.2s ease, transform 0.1s ease;
		border-radius: 50%;
		cursor: pointer;
		cursor: grab;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		touch-action: none;
		will-change: transform;
		
		&:after {
			content: "";
			display: block;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			background: ${colors.primary};
			transition: all 0.2s ease;
		}
		
		&:active {
			cursor: grabbing;
			transform: scale(1.05);
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
			
			&:after {
				transform: scale(0.8);
				background: ${colors.primaryDark};
			}
		}
		
		&:hover {
			&:after {
				background: ${colors.primaryDark};
			}
		}
	`,
	sliderText: css`
		position: relative;
		z-index: 1;
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
		font-size: 18px;
		font-weight: 600;
		color: ${colors.primary};
		text-align: center;
		margin-bottom: 15px;
		letter-spacing: 0.5px;
	`,
	instruction: css`
		font-size: 14px;
		font-weight: 400;
		color: ${colors.textLight};
		text-align: center;
		margin-bottom: 15px;
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
	`
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
	const [baseState, updateBaseState] = useProcaptcha(useState, useRef);
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
		attemptCount: 0
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
	const R = 9;  // Radius of the puzzle piece corners
	
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
		console.log('[SliderCaptcha] Using server-provided image URL:', challenge.imageUrl);
	}

	// Update target position checks
	const serverTargetPosition = challenge?.targetPosition;
	
	// Initialize the puzzle immediately when the component mounts
	useEffect(() => {
		// Pre-generate a random destination so we have it ready
		const randomX = getRandomInt(60, 260);
		setDestX(randomX);
		xRef.current = randomX;
		
		// Pre-load the initial image
		setPuzzleImage(getRandomImage());
	}, []);

	// Update to ensure the canvas is initialized when the modal shows
	useEffect(() => {
		if (state.showModal) {
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
			} else {
				resetPuzzle();
				// Return empty cleanup function to satisfy TypeScript
				return () => {};
			}
		}
		// Return empty cleanup function to satisfy TypeScript
		return () => {};
	}, [state.showModal]);

	useEffect(() => {
		if (config.language) {
			if (i18n) {
				if (i18n.language !== config.language) {
					i18n.changeLanguage(config.language).then((r) => r);
				}
			} else {
				loadI18next(false).then((i18n) => {
					if (i18n.language !== config.language)
						i18n.changeLanguage(config.language).then((r) => r);
				});
			}
		}
	}, [i18n, config.language]);

	useEffect(() => {
		if (state.error) {
			setLoading(false);
			// Type error fix: Treat error as an object with a key property
			const errorObj = typeof state.error === 'object' && state.error !== null 
				? state.error as { key?: string }
				: { key: undefined };
			
			if (errorObj.key === "CAPTCHA.NO_SESSION_FOUND" && frictionlessState) {
				setTimeout(() => {
					frictionlessState.restart();
				}, 3000);
			}
		}
	}, [state.error, frictionlessState]);

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
		// Get a random image from picsum
		const imageId = getRandomInt(1, 1000);
		return `https://picsum.photos/id/${imageId}/320/160`;
	};

	// Add additional logging for debugging server challenge
	useEffect(() => {
		if (manager && state?.challenge) {
			console.log('[SliderCaptcha] Received challenge from server:', state.challenge);
			if (state.challenge.imageUrl) {
				console.log('[SliderCaptcha] Using server-provided image URL:', state.challenge.imageUrl);
			} else {
				console.log('[SliderCaptcha] No image URL provided, will generate client-side puzzle');
			}
		}
	}, [manager, state?.challenge]);

	// Modify the resetPuzzle function to use the server-provided image if available
	const resetPuzzle = useCallback(() => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		// Set loading state
		setImageLoading(true);

		// Generate a random destination if not provided in challenge
		const puzzleDestination = serverTargetPosition || getRandomInt(20, 300);

		// If we have a server-provided image URL, use it
		if (state?.challenge?.imageUrl) {
			const img = new Image();
			img.onload = () => {
				drawPuzzleFromImage(img, puzzleDestination);
				setImageLoading(false);
			};
			img.onerror = () => {
				console.error("Failed to load server image, falling back to client-side generation");
				generateRandomImage(puzzleDestination);
			};
			img.src = state.challenge.imageUrl;
		} else {
			// Otherwise, generate a random image client-side
			generateRandomImage(puzzleDestination);
		}
	}, [canvasRef, blockRef, state?.challenge]);

	// Add a function to draw puzzle from a pre-loaded image
	const drawPuzzleFromImage = (img: HTMLImageElement, destination: number) => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const block = blockRef.current;
		const ctx = canvas.getContext('2d');
		const blockCtx = block.getContext('2d');

		if (!ctx || !blockCtx) {
			return;
		}

		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;
		
		// Clear canvas
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		blockCtx.clearRect(0, 0, block.width, block.height);
		
		// Draw the image on the canvas with proper scaling
		ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
		
		// Generate the puzzle piece
		const blockX = 0;
		const blockY = Math.random() * (canvasHeight - 60) + 10;
		
		// Store the current destination and block position
		setDestX(destination);
		xRef.current = destination;
		setPuzzleImage(getRandomImage());
		
		// Create a puzzle piece and cut it out of the canvas
		blockCtx.drawImage(canvas, blockX, blockY, 40, 40, 0, 0, 40, 40);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(blockX, blockY, 40, 40);
	};

	// Add a function to generate a random image when there's no server-provided one
	const generateRandomImage = (destination: number) => {
		if (!canvasRef.current || !blockRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const block = blockRef.current;
		const ctx = canvas.getContext('2d');
		const blockCtx = block.getContext('2d');

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
		
		// Store the destination value
		setDestX(destination);
		xRef.current = destination;
		
		// Set a new random image
		setPuzzleImage(getRandomImage());
		
		// Draw the image onto the canvas once it's loaded
		const img = new Image();
		
		img.onload = () => {
			// Draw main image
			ctx.drawImage(img, 0, 0, 320, 160);
			
			// Draw the puzzle piece shape
			drawPuzzlePiece(ctx, destination, 80, 'fill');
			drawPuzzlePiece(blockCtx, destination, 80, 'clip');
			
			// Draw the image on the block canvas
			blockCtx.drawImage(img, 0, 0, 320, 160);
			
			// Get the puzzle piece image data and place it at the left
			const imageData = blockCtx.getImageData(destination - R, 80 - R * 2, L + R * 2, L + R * 2);
			blockCtx.clearRect(0, 0, 320, 160);
			block.width = L + R * 2;
			blockCtx.putImageData(imageData, 0, 80 - R * 2);
			
			// Hide loading state
			setImageLoading(false);
		};
		
		img.onerror = () => {
			// Handle image loading error by trying a different image
			console.error("Failed to load image, trying another one");
			setPuzzleImage(getRandomImage());
			generateRandomImage(destination);
		};
		
		img.crossOrigin = "Anonymous";
		img.src = puzzleImage;
	};

	// Draw the puzzle piece
	const drawPuzzlePiece = (ctx: CanvasRenderingContext2D, x: number, y: number, operation: 'fill' | 'clip') => {
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
		
		if (operation === 'fill') {
			ctx.fill();
		} else {
			ctx.clip();
		}
	};

	// Update verifySlider to use server target position and add debug logging
	const verifySlider = (sliderLeftValue: number) => {
		// Get the current target position from state or destX
		const targetPosition = state?.challenge?.targetPosition || destX;
		
		// Debug logging
		console.log('[SliderCaptcha] Verifying slider position:', sliderLeftValue);
		console.log('[SliderCaptcha] Target position:', targetPosition);
		console.log('[SliderCaptcha] Distance from target:', Math.abs(sliderLeftValue - targetPosition));
		
		// Calculate verification based on how close the slider is to the target position
		const isClose = Math.abs(sliderLeftValue - targetPosition) < 10;
		
		console.log('[SliderCaptcha] Is close enough to target?', isClose);
		
		// Return verification data
		return {
			verified: isClose,
			destX: targetPosition,
		};
	};

	// Touch and mouse event handlers similar to the demo
	const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
		if ('touches' in e && e.touches[0]) {
			originXRef.current = e.touches[0].clientX;
			originYRef.current = e.touches[0].clientY;
		} else if ('clientX' in e) {
			originXRef.current = e.clientX;
			originYRef.current = e.clientY;
		}
		isMouseDownRef.current = true;
		trailRef.current = []; // Reset trail
	};

	const handleDragMove = (e: MouseEvent | TouchEvent) => {
		if (!isMouseDownRef.current) return false;
		e.preventDefault();
		
		let eventX, eventY;
		if ('touches' in e) {
			if (!e.touches[0]) return false;
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}
		
		const moveX = eventX - originXRef.current;
		const moveY = eventY - originYRef.current;
		
		// Limit movement within bounds
		if (moveX < 0 || moveX + 38 >= 320) return false;
		
		// Update slider position
		setSliderLeft(moveX);
		
		// Calculate block position (adjusting for margins)
		const blockLeft = ((320 - 40 - 20) / (320 - 40)) * moveX;
		
		// Apply position directly to the DOM
		if (blockRef.current) {
			blockRef.current.style.left = `${blockLeft}px`;
		}
		
		// Update slider appearance
		setSliderClass("sliderContainer sliderContainer_active");
		
		// Record Y movement for verification
		trailRef.current.push(moveY);
		
		// Track mouse movement in manager for verification
		manager.trackMouseMovement(eventX, eventY);
		
		return true;
	};

	const handleDragEnd = (e: MouseEvent | TouchEvent) => {
		if (!isMouseDownRef.current) return false;
		isMouseDownRef.current = false;
		
		let eventX;
		if ('changedTouches' in e && e.changedTouches[0]) {
			eventX = e.changedTouches[0].clientX;
		} else if ('clientX' in e) {
			eventX = e.clientX;
		} else {
			return false; // No valid coordinates found
		}
		
		// No movement case
		if (eventX === originXRef.current) return false;
		
		setSliderClass("sliderContainer");
		
		// Verify the puzzle completion
		const verificationData = verifySlider(eventX);
		const { verified } = verificationData;
		
		// Calculate stats for debug purposes
		const yTrailData = trailRef.current;
		const yAverage = yTrailData.length > 0 ? yTrailData.reduce(sum) / yTrailData.length : 0;
		const yDeviations = yTrailData.map(y => y - yAverage);
		const yStdDev = yTrailData.length > 0 ? 
			Math.sqrt(yDeviations.map(square).reduce(sum, 0) / yTrailData.length) : 0;
		
		const debugInfo = {
			captchaResult: {
				passed: verified,
				destX: verificationData.destX ?? 0,
				verified: verified
			},
			positionData: {
				sliderPosition: eventX,
				blockPosition: verificationData.destX ?? 0,
				targetPosition: verificationData.destX ?? 0,
				offset: Math.abs((verificationData.destX ?? 0) - (verificationData.destX ?? 0))
			},
			mouseMovement: {
				yTrailPoints: yTrailData.length,
				yAverage: yAverage.toFixed(2),
				yStandardDeviation: yStdDev.toFixed(2),
				hasVariation: yStdDev > 0
			}
		};
		
		console.log(`Captcha Debug Information:
${JSON.stringify(debugInfo, null, 2)}`);
		
		if (verified) {
			// Success case - Use the manager's onSuccess to verify with additional checks
			manager.onSuccess(eventX, verificationData.destX).then((isVerified) => {
				if (isVerified) {
					// Manager has already handled the verification success internally
					// Just handle UI updates
					setSliderClass("sliderContainer sliderContainer_success");
					setIsSuccess(true);
					setIsVerified(true);
					setShowSuccessIcon(true);
				} else {
					// Verification still failed in manager's additional checks
					setSliderClass("sliderContainer sliderContainer_fail");
					setIsFailed(true);
					
					// Reset after delay
					setTimeout(() => {
						resetPuzzle();
					}, 1000);
				}
			});
		} else {
			// Puzzle piece not in the right position
			setSliderClass("sliderContainer sliderContainer_fail");
			setIsFailed(true);
			
			// Reset after delay
			setTimeout(() => {
				resetPuzzle();
			}, 1000);
		}
		
		return true;
	};

	// Remove separate mouse/touch event handlers and use container-level handling
	useEffect(() => {
		// Add event listeners to the document for drag events
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);
		document.addEventListener('touchmove', handleDragMove, { passive: false });
		document.addEventListener('touchend', handleDragEnd);
		
		// Cleanup function to remove event listeners
		return () => {
			document.removeEventListener('mousemove', handleDragMove);
			document.removeEventListener('mouseup', handleDragEnd);
			document.removeEventListener('touchmove', handleDragMove);
			document.removeEventListener('touchend', handleDragEnd);
		};
	}, []);

	// Pre-load images to avoid delay when modal opens
	useEffect(() => {
		// Preload a few images for faster response when modal opens
		const preloadImages = () => {
			for (let i = 0; i < 3; i++) {
				const img = new Image();
				img.src = getRandomImage();
			}
		};
		
		preloadImages();
	}, []);

	// Add a CSS class for proper styling of the slider states
	useEffect(() => {
		const addSliderStyles = () => {
			// Add CSS for slider states if not already in document
			if (!document.getElementById('slider-captcha-styles')) {
				const styleEl = document.createElement('style');
				styleEl.id = 'slider-captcha-styles';
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
			const styleEl = document.getElementById('slider-captcha-styles');
			if (styleEl) {
				document.head.removeChild(styleEl);
			}
		};
	}, []);

	// Success icon component (checkmark)
	const SuccessIcon = () => (
		<div 
			className={`success-icon ${showSuccessIcon ? 'show' : ''}`}
			css={styles.successIcon}
			aria-hidden="true"
		>
			<svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path 
					d="M8.79508 15.875L4.62508 11.705L3.20508 13.115L8.79508 18.705L20.7951 6.70504L19.3851 5.29504L8.79508 15.875Z" 
					fill="currentColor"
				/>
			</svg>
		</div>
	);

	if (config.mode === "invisible") {
		return (
			<Modal show={state.showModal}>
				<div css={styles.container}>
					<div css={styles.title}>Verify you are human</div>
					<div css={styles.instruction}>Drag the puzzle piece into position</div>
					
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
								<div css={styles.loadingSpinner}></div>
								<div css={styles.loadingText}>Loading puzzle...</div>
							</div>
						)}
						<div 
							css={styles.refreshIcon}
							onClick={resetPuzzle}
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
						<div 
							css={styles.sliderMask} 
							ref={maskRef}
							style={{ width: `${sliderLeft}px` }}
						/>
						<div 
							css={styles.slider} 
							ref={thumbRef}
							style={{ left: `${sliderLeft}px` }}
							onMouseDown={handleDragStart}
							onTouchStart={handleDragStart}
						/>
					</div>
				</div>
			</Modal>
		);
	}

	return (
		<div className={"slider-captcha"}>
			<Modal show={state.showModal}>
				<div css={styles.container}>
					<div css={styles.title}>Verify you are human</div>
					<div css={styles.instruction}>Drag the puzzle piece into position</div>
					
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
								<div css={styles.loadingSpinner}></div>
								<div css={styles.loadingText}>Loading puzzle...</div>
							</div>
						)}
						<div 
							css={styles.refreshIcon}
							onClick={resetPuzzle}
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
						<div 
							css={styles.sliderMask} 
							ref={maskRef}
							style={{ width: `${sliderLeft}px` }}
						/>
						<div 
							css={styles.slider} 
							ref={thumbRef}
							style={{ left: `${sliderLeft}px` }}
							onMouseDown={handleDragStart}
							onTouchStart={handleDragStart}
						/>
					</div>
				</div>
			</Modal>
			<Checkbox
				theme={theme}
				onChange={async () => {
					if (loading) {
						return;
					}
					setLoading(true);
					// Use manager.start() instead of directly setting the state
					await manager.start();
					setLoading(false);
				}}
				checked={state.isHuman}
				labelText={t("WIDGET.I_AM_HUMAN")}
				// Type error fix: Ensure error property has message or convert to string
				error={typeof state.error === 'object' && state.error !== null && 'message' in state.error 
					? (state.error as {message: string}).message
					: typeof state.error === 'string' ? state.error : undefined}
				aria-label="human checkbox"
				loading={loading}
			/>
		</div>
	);
};

export default SliderCaptchaWidget; 