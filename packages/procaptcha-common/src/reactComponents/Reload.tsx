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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { type ButtonHTMLAttributes, type FC, useMemo, useState } from "react";

interface ReloadButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	themeColor: "light" | "dark";
	onReload: () => void;
}

// M3 icon button: a 40dp circular container holding a 24dp icon.
const buttonStyleBase = {
	border: "none",
	padding: "8px",
	cursor: "pointer",
	height: "40px",
	width: "40px",
	borderRadius: "50%",
	display: "flex",
};

export const ReloadButton: FC<ReloadButtonProps> = ({
	themeColor,
	onReload,
}: ReloadButtonProps) => {
	const theme = useMemo(
		() => (themeColor === "light" ? lightTheme : darkTheme),
		[themeColor],
	);
	const [hover, setHover] = useState(false);
	// M3 requires a visible focus indicator; matched imperatively so the ring is
	// keyboard-only.
	const [focusVisible, setFocusVisible] = useState(false);
	const buttonStyle = useMemo(() => {
		return {
			...buttonStyleBase,
			...(focusVisible
				? {
						// M3 focus indicator: 3dp outline, 2dp offset.
						outline: `3px solid ${theme.palette.primary.main}`,
						outlineOffset: "2px",
					}
				: {}),
			// Material 3 tonal icon button; hover swaps to the state-layer fill so
			// the feedback is visible in dark mode too (a brightness filter is not).
			backgroundColor: hover
				? theme.palette.primaryContainer.hover
				: theme.palette.primaryContainer.main,
			color: theme.palette.primaryContainer.contrastText,
			transition: "background-color 0.25s",
			justifyContent: "center",
			alignItems: "center",
			margin: "0 auto",
		};
	}, [hover, theme, focusVisible]);
	return (
		<button
			className="reload-button"
			aria-label="Reload"
			type="button"
			style={buttonStyle}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={(e) => setFocusVisible(e.target.matches(":focus-visible"))}
			onBlur={() => setFocusVisible(false)}
			onClick={(e) => {
				e.preventDefault();
				onReload();
			}}
		>
			<svg
				width="24px"
				height="24px"
				viewBox="0 0 16 16"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				xmlnsXlink="http://www.w3.org/1999/xlink"
				style={{ display: "flex" }}
			>
				<title>reload</title>
				<path
					shapeRendering="optimizeQuality"
					fill={theme.palette.primaryContainer.contrastText}
					transform={"scale(0.0416)"}
					d="M234.666667,149.333333 L234.666667,106.666667 L314.564847,106.664112 C287.579138,67.9778918 242.745446,42.6666667 192,42.6666667 C109.525477,42.6666667 42.6666667,109.525477 42.6666667,192 C42.6666667,274.474523 109.525477,341.333333 192,341.333333 C268.201293,341.333333 331.072074,284.258623 340.195444,210.526102 L382.537159,215.817985 C370.807686,310.617565 289.973536,384 192,384 C85.961328,384 1.42108547e-14,298.038672 1.42108547e-14,192 C1.42108547e-14,85.961328 85.961328,1.42108547e-14 192,1.42108547e-14 C252.316171,1.42108547e-14 306.136355,27.8126321 341.335366,71.3127128 L341.333333,1.42108547e-14 L384,1.42108547e-14 L384,149.333333 L234.666667,149.333333 Z"
				/>
			</svg>
		</button>
	);
};
