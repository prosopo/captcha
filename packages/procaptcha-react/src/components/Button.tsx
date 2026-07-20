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
import { darkTheme, lightTheme, withAlpha } from "@prosopo/widget-skeleton";
import type React from "react";
import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	useMemo,
	useState,
} from "react";
import addDataAttr from "../util/index.js";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	themeColor: "light" | "dark";
	buttonType: "cancel" | "next";
	onClick: () => void;
	text: string;
}

const buttonStyleBase: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	position: "relative",
	boxSizing: "border-box",
	outline: "0px",
	margin: "0px",
	cursor: "pointer",
	userSelect: "none",
	verticalAlign: "middle",
	appearance: undefined,
	textDecoration: "none",
	// Material 3 buttons use sentence case, not all-caps.
	textTransform: "none",
	minWidth: "64px",
	// min, not fixed: long localized labels wrap to two lines in narrow widgets
	// and the button must grow to keep the text inside its rounded fill.
	// 40dp is the M3 button height.
	minHeight: "40px",
	// Full pill — the Material 3 shape for the action row.
	borderRadius: "100px",
	border: "none",
	transition:
		"background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, filter 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
	backgroundColor: "transparent",
};

const Button: React.FC<ButtonProps> = ({
	themeColor,
	buttonType,
	text,
	onClick,
}: ButtonProps) => {
	const theme = useMemo(
		() => (themeColor === "light" ? lightTheme : darkTheme),
		[themeColor],
	);
	const [hover, setHover] = useState(false);
	// M3 requires a visible focus indicator. :focus-visible is matched
	// imperatively so the ring appears for keyboard focus but not mouse clicks,
	// without pulling a CSS-in-JS dependency into this component.
	const [focusVisible, setFocusVisible] = useState(false);
	const buttonStyle: CSSProperties = useMemo(() => {
		const baseStyle: CSSProperties = {
			...buttonStyleBase,
			...theme.typography.labelLarge,
			borderRadius: theme.shape.button,
			fontFamily: theme.font.fontFamily,
			width: "100%",
		};
		if (buttonType === "cancel") {
			// Material 3 "text" button — no fill at rest, an 8% primary state layer
			// on hover. M3 text buttons use 12dp horizontal padding.
			return {
				...baseStyle,
				padding: "8px 12px",
				backgroundColor: hover
					? withAlpha(theme.palette.primary.main, theme.stateLayer.hover)
					: "transparent",
				color: theme.palette.primary.main,
			};
		}
		// Material 3 "filled" button — the primary action. No resting elevation;
		// hover is an 8% on-primary state layer composited over the fill, which is
		// how M3 defines it (a brightness filter is not a state layer and behaves
		// inconsistently across themes). 24dp horizontal padding.
		return {
			...baseStyle,
			padding: "8px 24px",
			backgroundColor: theme.palette.primary.main,
			color: theme.palette.primary.contrastText,
			boxShadow: hover
				? `inset 0 0 0 100px ${withAlpha(
						theme.palette.primary.contrastText,
						theme.stateLayer.hover,
					)}`
				: theme.elevation.buttonPrimary,
		};
	}, [buttonType, hover, theme]);

	return (
		<button
			{...addDataAttr({ dev: { cy: `button-${buttonType}` } })}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			onFocus={(e) => setFocusVisible(e.target.matches(":focus-visible"))}
			onBlur={() => setFocusVisible(false)}
			style={{
				...buttonStyle,
				// M3 focus indicator: 3dp outline, 2dp offset.
				...(focusVisible
					? {
							outline: `3px solid ${theme.palette.primary.main}`,
							outlineOffset: "2px",
						}
					: {}),
			}}
			onClick={(e) => {
				if (!e.isTrusted) {
					return;
				}
				e.preventDefault();
				onClick();
			}}
			aria-label={text}
		>
			{text}
		</button>
	);
};
export default Button;
