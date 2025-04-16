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
import { useTranslation } from "@prosopo/locale";
import { useProcaptcha } from "@prosopo/procaptcha-common";
import {
	ProcaptchaConfigSchema,
	type ProcaptchaProps,
	type ProcaptchaSliderState,
	type SliderCaptchaResponseBody,
	ApiParams,
} from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { Manager } from "../services/Manager.js";
import Modal from "./Modal.js";
import { styles, sliderActiveClass, sliderSuccessClass, sliderFailClass } from "./SliderCaptchaStyles.js";
import { CaptchaCheckbox } from "./CaptchaCheckbox.js";

const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

export const SliderCaptchaWidget = (props: ProcaptchaProps) => {
	const { t } = useTranslation();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState;
	const i18n = props.i18n;
	const callbacks = props.callbacks || {};
	const [baseState, updateBaseState] = useProcaptcha<SliderCaptchaResponseBody>(useState, useRef);
	const [loading, setLoading] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);
	const [isVerifying, setIsVerifying] = useState(false);

	// Create a stable reference for the state
	const stateRef = useRef<ProcaptchaSliderState>({
		...baseState,
		config,
		frictionlessState,
		i18n,
		callbacks,
		mouseMovements: [],
		attemptCount: 0,
		challenge: baseState.challenge,
	});

	// Create stable references for updateBaseState function
	const updateBaseStateRef = useRef(updateBaseState);
	updateBaseStateRef.current = updateBaseState; // Keep the reference updated

	// Create a stable Manager instance that won't be recreated
	const managerRef = useRef<ReturnType<typeof Manager> | null>(null);

	// Update the state ref when baseState changes
	useEffect(() => {
		stateRef.current = {
			...baseState,
			config,
			frictionlessState,
			i18n,
			callbacks,
			mouseMovements: stateRef.current.mouseMovements,
			attemptCount: stateRef.current.attemptCount,
			challenge: baseState.challenge,
		};
	}, [baseState, config, frictionlessState, i18n, callbacks]);

	// Initialize manager once and KEEP it
	useEffect(() => {
		if (!managerRef.current) {
			console.log("[SliderCaptcha] Creating Manager ONCE");
			managerRef.current = Manager(
				config,
				stateRef.current,
				updateBaseStateRef.current,
				callbacks,
				frictionlessState,
			);
		}
	}, []);

	// Always use the stored manager instance, never create a new one inline
	const manager = managerRef.current || (() => {
		// This should only run on the very first render
		console.log("[SliderCaptcha] Initial manager creation");
		const newManager = Manager(
			config,
			stateRef.current,
			updateBaseStateRef.current,
			callbacks,
			frictionlessState,
		);
		managerRef.current = newManager;
		return newManager;
	})();

	const theme = "light" === stateRef.current.config.theme ? lightTheme : darkTheme;

	// Puzzle captcha state
	const [sliderLeft, setSliderLeft] = useState(0);
	const [sliderClass, setSliderClass] = useState("sliderContainer");
	const [isVerified, setIsVerified] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFailed, setIsFailed] = useState(false);
	const [destX, setDestX] = useState(0);
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
	// Add a ref to track the current position in real-time
	const currentPositionRef = useRef<number>(0);

	// Update type assertions for challenge
	const challenge = stateRef.current.challenge as SliderCaptchaResponseBody;

	// Update image URL checks
	if (challenge?.imageUrl) {
		console.log(
			"[SliderCaptcha] Using server-provided image URL:",
			challenge.imageUrl,
		);
	}

	// Update to ensure the canvas is initialized when the modal shows
	useEffect(() => {
		if (stateRef.current.showModal) {
			// Only initialize if we have a challenge
			if (stateRef.current.challenge) {
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
	}, [stateRef.current.showModal, stateRef.current.challenge]);

	// Add event listener for the execute event
	useEffect(() => {
		// Event handler for when execute() is called
		const handleExecuteEvent = (event: Event) => {
			console.log("[SliderCaptcha] Execute event received");
			
			// Reset any previous state
			setSliderLeft(0);
			setSliderClass("sliderContainer");
			setIsVerified(false);
			setIsSuccess(false);
			setIsFailed(false);
			setShowSuccessIcon(false);
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
			
			// Request a fresh challenge from the provider
			if (config.mode === "invisible") {
				console.log("[SliderCaptcha] Invisible mode - requesting new challenge");
				
				// Show loading state
				setLoading(true);
				
				// Request a new challenge before showing the modal
				(async () => {
					try {
						// Start the verification flow
						await manager.start();
						
						// Now show the modal with the new challenge
						updateBaseState({
							showModal: true,
						});
					} catch (error) {
						console.error("[SliderCaptcha] Error starting challenge:", error);
					} finally {
						setLoading(false);
					}
				})();
			} else {
				// For visible mode, just show the modal
				updateBaseState({
					showModal: true,
				});
			}
		};

		document.addEventListener(PROCAPTCHA_EXECUTE_EVENT, handleExecuteEvent);

		// Cleanup function to remove event listener
		return () => {
			document.removeEventListener(
				PROCAPTCHA_EXECUTE_EVENT,
				handleExecuteEvent,
			);
		};
	}, [updateBaseState, manager, config.mode]);

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
			const challenge = stateRef.current.challenge as SliderCaptchaResponseBody;
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
				throw new Error("Invalid target position format");
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
			throw error;
		}
	}, [canvasRef, blockRef, stateRef.current.challenge]);

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
			// Pass the retry count to prevent infinite loops
			generateRandomImage(destination, retryCount + 1);
		};

		img.crossOrigin = "anonymous";
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
		e.preventDefault(); // Prevent default to ensure consistent behavior
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
		if (!isMouseDownRef.current) {
			return false;
		}
		e.preventDefault(); // Prevent default to ensure consistent behavior

		let eventX;
		let eventY;
		if ("touches" in e) {
			if (!e.touches[0]) {
				return false;
			}
			eventX = e.touches[0].clientX;
			eventY = e.touches[0].clientY;
		} else {
			eventX = e.clientX;
			eventY = e.clientY;
		}

		// Calculate the slider position relative to its container
		const sliderContainer = sliderRef.current;
		if (!sliderContainer) {
			return false;
		}

		const containerRect = sliderContainer.getBoundingClientRect();
		const relativeX = eventX - containerRect.left;
		
		// Limit movement within bounds (0 to container width - slider handle width)
		const maxMove = Math.min(Math.max(relativeX, 0), containerRect.width - 40);
		
		// Update both the React state and the ref for immediate access
		setSliderLeft(maxMove);
		currentPositionRef.current = maxMove;

		// Update block position to match slider movement (keep them synchronized)
		if (blockRef.current) {
			blockRef.current.style.left = `${maxMove}px`;
		}

		// Update slider appearance
		setSliderClass("sliderContainer sliderContainer_active");

		// Record Y movement for verification
		const moveY = eventY - originYRef.current;
		trailRef.current.push(moveY);

		// Track mouse movement in manager for verification
		manager.trackMouseMovement(eventX, eventY);

		return true;
	};

	const handleVerificationFailure = () => {
		setSliderClass("sliderContainer sliderContainer_fail");
		setIsFailed(true);

		// In invisible mode, call the onFailed callback
		if (config.mode === "invisible" && callbacks && 'onFailed' in callbacks && typeof callbacks.onFailed === 'function') {
			callbacks.onFailed();
		}

		// Reset after delay
		setTimeout(async () => {
			// First close the modal and reset all state
			handleCloseModal();
			
			// For visible mode, try again automatically
			if (config.mode !== "invisible") {
				// Small additional delay to ensure state is cleared
				setTimeout(() => {
					// Find and click the checkbox to start fresh
					const checkbox = document.querySelector('.slider-captcha input[type="checkbox"]') as HTMLInputElement;
					if (checkbox) {
						checkbox.click();
					}
				}, 100);
			}
		}, 1000);
	};

	const handleDragEnd = (e: MouseEvent | TouchEvent) => {
		console.log("SLIDER-DEBUG: Drag end called");
		e.preventDefault(); // Prevent default to ensure consistent behavior
		
		if (!isMouseDownRef.current) {
			console.log("SLIDER-DEBUG: Early exit - mouse not down");
			return false;
		}
		
		isMouseDownRef.current = false;

		// Get the final slider position from the ref instead of state
		const finalPosition = currentPositionRef.current;
		console.log(`SLIDER-DEBUG: Final position: ${finalPosition}`);

		// No movement case
		if (finalPosition === 0) {
			console.log("SLIDER-DEBUG: No movement detected");
			return false;
		}

		setSliderClass("sliderContainer");

		// Get the target position from state or destX
		const targetPosition = stateRef.current?.challenge?.targetPosition || destX;
		console.log(`SLIDER-DEBUG: Target position: ${targetPosition}`);
		
		// Get the challenge ID from the state
		const challengeId = stateRef.current?.challenge?.challengeId;

		if (!challengeId) {
			console.log("SLIDER-DEBUG: No challenge ID found");
			handleVerificationFailure();
			return false;
		}

		// Remove client-side position verification - let the server decide
		// Set verifying state
		setIsVerifying(true);
		console.log("SLIDER-DEBUG: Starting verification");

		// Submit to provider for verification - let server decide if position is valid
		manager.onSuccess(finalPosition, targetPosition).then((isVerified) => {
			console.log(`SLIDER-DEBUG: Verification result: ${isVerified}`);
			setIsVerifying(false);
			if (isVerified) {
				// Server verified successfully
				setSliderClass("sliderContainer sliderContainer_success");
				setIsSuccess(true);
				setIsVerified(true);
				setShowSuccessIcon(true);
				
				// In invisible mode, close modal after a brief delay to show success
				if (config.mode === "invisible") {
					setTimeout(() => {
						// Close the modal
						handleCloseModal();
						
						// Call the success callback to continue form submission
						if (callbacks && 'onSuccess' in callbacks && typeof callbacks.onSuccess === 'function') {
							callbacks.onSuccess();
						}
					}, 1000);
				}
			} else {
				// Server rejected the verification
				handleVerificationFailure();
			}
		}).catch((error) => {
			console.log("SLIDER-DEBUG: Verification failed with error");
			setIsVerifying(false);
			handleVerificationFailure();
		});

		return true;
	};

	// Update the useEffect for event listeners to ensure proper cleanup
	useEffect(() => {
		console.log("SLIDER-DEBUG: Setting up event listeners");
		
		const handleMouseUp = (e: MouseEvent) => {
			console.log("SLIDER-DEBUG: Mouse up event triggered");
			handleDragEnd(e);
		};
		
		const handleTouchEnd = (e: TouchEvent) => {
			console.log("SLIDER-DEBUG: Touch end event triggered");
			handleDragEnd(e);
		};

		// Add event listeners to the document for drag events
		document.addEventListener("mousemove", handleDragMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("touchmove", handleDragMove, { passive: false });
		document.addEventListener("touchend", handleTouchEnd);

		// Cleanup function to remove event listeners
		return () => {
			document.removeEventListener("mousemove", handleDragMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("touchmove", handleDragMove);
			document.removeEventListener("touchend", handleTouchEnd);
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
		setIsVerifying(false);
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

		// Close the modal and update state accordingly
		// In invisible mode, we want to keep the human verification state
		if (config.mode === "invisible" && isSuccess) {
			// For invisible mode with successful verification, keep isHuman true
			updateBaseState({
				showModal: false,
				isHuman: true, // Keep this true for invisible mode after success
				challenge: undefined,
				error: undefined
			});
		} else {
			// For normal/failed cases, reset everything
			updateBaseState({
				showModal: false,
				isHuman: false,
				challenge: undefined,
				attemptCount: 0,
				error: undefined
			});
		}
	}, [updateBaseState, isSuccess, config.mode]);

	// Modify the puzzle piece rendering to support shaped pieces
	const handleChallengeUpdate = useCallback(() => {
		// Reset any verification state
		setIsVerified(false);
		setIsSuccess(false);
		setIsFailed(false);
		setShowSuccessIcon(false);
		
		setImageLoading(true);

		// Check if we have a server-provided challenge
		if (stateRef.current.challenge) {
			// Check if this is a shaped slider captcha with pre-generated images
			if (stateRef.current.challenge.baseImageUrl && stateRef.current.challenge.puzzlePieceUrl) {
				console.log('[SliderCaptcha] Rendering shaped slider captcha');
				
				// We have pre-rendered base and puzzle piece images
				renderShapedSliderCaptcha(
					stateRef.current.challenge.baseImageUrl,
					stateRef.current.challenge.puzzlePieceUrl,
					stateRef.current.challenge.targetPosition2D?.x || 
					stateRef.current.challenge.targetPosition || 
					Math.floor(Math.random() * 280) + 20
				);
			} else if (stateRef.current.challenge.imageUrl) {
				console.log('[SliderCaptcha] Rendering simple slider captcha');
				
				// Load the server-provided image
				const img = new Image();
				img.crossOrigin = "anonymous";
				img.onload = () => {
					// We have the challenge image, now draw the puzzle at the target position
					drawPuzzleFromImage(
						img, 
						stateRef.current?.challenge?.targetPosition || 
						Math.floor(Math.random() * 280) + 20
					);
					setImageLoading(false);
				};
				img.onerror = () => {
					console.error('[SliderCaptcha] Error loading challenge image');
					throw new Error("Error loading challenge image");
				};
				img.src = stateRef.current.challenge.imageUrl;
			} else {
				console.log('[SliderCaptcha] No image provided in challenge, generating random one');
				// No image provided in the challenge, generate a random one
				throw new Error("No image provided in challenge");
			}
		} else {
			console.log('[SliderCaptcha] No challenge provided, generating random one');
			// No challenge provided, generate a random puzzle
			throw new Error("No challenge provided");
		}
	}, [canvasRef, blockRef, stateRef.current.challenge]);

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
			if (stateRef.current?.challenge?.targetPosition2D?.y !== undefined) {
				targetY = stateRef.current.challenge.targetPosition2D.y;
			} else if (stateRef.current?.challenge?.targetPosition && typeof stateRef.current.challenge.targetPosition === 'object' && 'y' in stateRef.current.challenge.targetPosition) {
				targetY = (stateRef.current.challenge.targetPosition as {x: number, y: number}).y;
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

	// Add reference to find parent form for token submission
	const containerRef = useRef<HTMLDivElement>(null);
	const [verificationToken, setVerificationToken] = useState<string>("");

	// Add a function to handle token submission to form
	const attachTokenToForm = useCallback((token: string) => {
		setVerificationToken(token);
		
		// Try to find the parent form
		if (containerRef.current) {
			const form = containerRef.current.closest('form');
			if (form) {
				// Remove any existing procaptcha response input
				const existingInputs = form.querySelectorAll(`input[name="${ApiParams.procaptchaResponse}"]`);
				existingInputs.forEach(input => input.remove());
				
				// Create and append the new input with token
				const input = document.createElement('input');
				input.type = 'hidden';
				input.name = ApiParams.procaptchaResponse;
				input.value = token;
				form.appendChild(input);
				
				console.log('[SliderCaptcha] Token attached to form', { 
					formId: form.id || 'unnamed form',
					tokenLength: token.length 
				});
			} else {
				console.warn('[SliderCaptcha] No parent form found to attach token');
			}
		}
	}, []);

	// Override onHuman callback to handle our token
	useEffect(() => {
		if (callbacks.onHuman && typeof callbacks.onHuman === 'function') {
			const originalOnHuman = callbacks.onHuman;
			callbacks.onHuman = (token: string) => {
				// Attach token to form
				attachTokenToForm(token);
				// Call original callback
				originalOnHuman(token);
			};
		}
	}, [callbacks, attachTokenToForm]);

	// Handle checkbox click - open the captcha modal
	const handleCheckboxClick = useCallback(() => {
		if (!baseState.isHuman) {
			console.log('[SliderCaptcha] Checkbox clicked, opening captcha modal');
			manager.start();
		}
	}, [baseState.isHuman, manager]);

	if (config.mode === "invisible") {
		return (
			<div ref={containerRef}>
				<CaptchaCheckbox 
					isHuman={baseState.isHuman}
					onClick={handleCheckboxClick}
					text={t("WIDGET.I_AM_HUMAN")}
				/>
				<Modal show={stateRef.current.showModal}>
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
									{isVerifying ? 'Verifying...' : 
									 isSuccess ? 'Verification complete!' : 
									 isFailed ? 'Verification failed. Try again.' : 
									 'Slide to verify'}
								</div>
							</div>
						</div>
					</div>
				</Modal>
			</div>
		);
	}

	return (
		<div ref={containerRef} className={"slider-captcha"}>
			<CaptchaCheckbox 
				isHuman={baseState.isHuman}
				onClick={handleCheckboxClick}
				text={t("WIDGET.I_AM_HUMAN")}
			/>
			<Modal show={stateRef.current.showModal}>
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
								{isVerifying ? 'Verifying...' : 
								 isSuccess ? 'Verification complete!' : 
								 isFailed ? 'Verification failed. Try again.' : 
								 'Slide to verify'}
							</div>
						</div>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default SliderCaptchaWidget;
