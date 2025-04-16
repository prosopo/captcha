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

import { css, keyframes } from "@emotion/react";

// Animation keyframes
export const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(72, 108, 214, 0.5); }
  50% { box-shadow: 0 0 15px rgba(72, 108, 214, 0.8); }
  100% { box-shadow: 0 0 5px rgba(72, 108, 214, 0.5); }
`;

export const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const slideInAnimation = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

// Modern color palette
export const colors = {
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

// Styles for slider and puzzle captcha
export const styles = {
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
	modalContent: css`
		display: flex;
		flex-direction: column;
		align-items: center;
	`,
};

// Define custom CSS class strings for slider states
export const sliderActiveClass = `
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

export const sliderSuccessClass = `
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

export const sliderFailClass = `
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
