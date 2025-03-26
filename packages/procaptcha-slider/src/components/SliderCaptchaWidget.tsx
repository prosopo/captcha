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
import { Manager } from "@prosopo/procaptcha";
import { Checkbox, useProcaptcha } from "@prosopo/procaptcha-common";
import { ProcaptchaConfigSchema, type ProcaptchaProps } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal.js";
import { css } from "@emotion/react";

// Define the same event name as in the bundle
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

// Add styles for slider
const sliderStyles = {
	container: css`
		width: 300px;
		height: 40px;
		background-color: #f5f5f5;
		border-radius: 20px;
		position: relative;
		margin: 20px auto;
		overflow: hidden;
		border: 1px solid #ddd;
	`,
	track: css`
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background-color: #5cb85c;
		border-radius: 20px;
	`,
	thumb: css`
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: white;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
		position: absolute;
		top: 0;
		cursor: grab;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		&:active {
			cursor: grabbing;
		}
	`,
	text: css`
		position: absolute;
		width: 100%;
		text-align: center;
		line-height: 40px;
		color: #555;
		font-size: 14px;
		user-select: none;
		z-index: 1;
	`
};

const SliderCaptchaWidget = (props: ProcaptchaProps) => {
	const { t } = useTranslation();
	const config = ProcaptchaConfigSchema.parse(props.config);
	const frictionlessState = props.frictionlessState; 
	const i18n = props.i18n;
	const callbacks = props.callbacks || {};
	const [state, updateState] = useProcaptcha(useState, useRef);
	const [loading, setLoading] = useState(false);
	const manager = Manager(
		config,
		state,
		updateState,
		callbacks,
		frictionlessState,
	);
	const theme = "light" === props.config.theme ? lightTheme : darkTheme;
	const [sliderPosition, setSliderPosition] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [isVerified, setIsVerified] = useState(false);
	const sliderRef = useRef<HTMLDivElement>(null);
	const thumbRef = useRef<HTMLDivElement>(null);

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
			updateState({
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
	}, [updateState]); 

	// Touch and mouse event handlers for slider
	const handleMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !sliderRef.current) return;
		const sliderWidth = sliderRef.current.offsetWidth;
		const thumbWidth = thumbRef.current?.offsetWidth || 40;
		const sliderRect = sliderRef.current.getBoundingClientRect();
		
		let newPosition = e.clientX - sliderRect.left;
		newPosition = Math.max(0, Math.min(newPosition, sliderWidth - thumbWidth));
		
		setSliderPosition(newPosition);
		
		// If slider reaches end, verify
		if (newPosition >= sliderWidth - thumbWidth - 5) {
			verifySlider();
		}
	};

	const handleMouseUp = () => {
		if (isDragging) {
			setIsDragging(false);
			
			// If not verified, reset position
			if (!isVerified) {
				setSliderPosition(0);
			}
			
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
	};

	// Touch events
	const handleTouchStart = (e: React.TouchEvent) => {
		setIsDragging(true);
		document.addEventListener('touchmove', handleTouchMove, { passive: false });
		document.addEventListener('touchend', handleTouchEnd);
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!isDragging || !sliderRef.current || !e.touches[0]) return;
		e.preventDefault();
		
		const sliderWidth = sliderRef.current.offsetWidth;
		const thumbWidth = thumbRef.current?.offsetWidth || 40;
		const sliderRect = sliderRef.current.getBoundingClientRect();
		
		let newPosition = e.touches[0].clientX - sliderRect.left;
		newPosition = Math.max(0, Math.min(newPosition, sliderWidth - thumbWidth));
		
		setSliderPosition(newPosition);
		
		// If slider reaches end, verify
		if (newPosition >= sliderWidth - thumbWidth - 5) {
			verifySlider();
		}
	};

	const handleTouchEnd = () => {
		if (isDragging) {
			setIsDragging(false);
			
			// If not verified, reset position
			if (!isVerified) {
				setSliderPosition(0);
			}
			
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
		}
	};

	const verifySlider = () => {
		setIsVerified(true);
		updateState({
			loading: false,
			isHuman: true,
			showModal: false
		});
		
		// Generate a dummy token
		const dummyToken = `slider_token_${Math.random().toString(36).substring(2, 15)}`;
		
		// Call onHuman callback with token
		callbacks.onHuman?.(dummyToken);
	};

	// Create a simple "lorem ipsum" card to show in the modal
	const LoremIpsumCard = () => (
		<div style={{
			backgroundColor: "white",
			padding: "20px",
			borderRadius: "8px",
			width: "400px",
			maxWidth: "90vw",
			boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
			color: "#333",
			fontFamily: "Arial, sans-serif"
		}}>
			<h2 style={{ marginTop: 0, color: "#2196F3" }}>Slider Captcha</h2>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, 
				nisi vel consectetur interdum, nisl nunc egestas nisi, vitae euismod nisl
				nunc eget nisl. Nullam euismod, nisi vel consectetur interdum, nisl nunc
				egestas nisi, vitae euismod nisl nunc eget nisl.
			</p>
			<div style={{ 
				display: "flex", 
				justifyContent: "flex-end",
				marginTop: "20px"
			}}>
				<button 
					style={{
						backgroundColor: "#2196F3",
						color: "white",
						border: "none",
						padding: "8px 16px",
						borderRadius: "4px",
						cursor: "pointer"
					}}
					onClick={() => {
						updateState({
							showModal: false,
							isHuman: true
						});
						
						// Call the onHuman callback if provided
						if (callbacks.onHuman) {
							// Use a dummy token string for now
							callbacks.onHuman("slider-captcha-demo-token");
						}
					}}
				>
					Close
				</button>
			</div>
		</div>
	);

	if (config.mode === "invisible") {
		return (
			<Modal show={state.showModal}>
				<LoremIpsumCard />
			</Modal>
		);
	}

	useEffect(() => {
		// Cleanup function to remove event listeners
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
		};
	}, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

	return (
		<div className={"slider-captcha"}>
			<Modal show={state.showModal}>
				<div>
					<h3>Please verify that you are human</h3>
					<div>
						<p>Drag the slider to the right to verify</p>
						<div css={sliderStyles.container} ref={sliderRef}>
							<div 
								css={sliderStyles.text} 
								style={{ opacity: isVerified ? 0 : 1 }}
							>
								{isVerified ? 'Verified!' : 'Slide to verify →'}
							</div>
							<div 
								css={sliderStyles.track} 
								style={{ width: `${sliderPosition + 20}px` }} 
							/>
							<div 
								css={sliderStyles.thumb} 
								ref={thumbRef}
								style={{ left: `${sliderPosition}px` }}
								onMouseDown={handleMouseDown}
								onTouchStart={handleTouchStart}
							>
								{isVerified ? '✓' : '→'}
							</div>
						</div>
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
					// Simply show the modal instead of using manager.start()
					updateState({
						showModal: true
					});
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