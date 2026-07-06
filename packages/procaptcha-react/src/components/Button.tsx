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
	fontWeight: 600,
	fontSize: "0.875rem",
	lineHeight: "1.75",
	letterSpacing: "0.02em",
	// Material 3 buttons use sentence case, not all-caps.
	textTransform: "none",
	minWidth: "64px",
	padding: "8px 16px",
	// min, not fixed: long localized labels wrap to two lines in narrow widgets
	// and the button must grow to keep the text inside its rounded fill.
	minHeight: "42px",
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
	const buttonStyle: CSSProperties = useMemo(() => {
		const baseStyle: CSSProperties = {
			...buttonStyleBase,
			borderRadius: theme.shape.button,
			fontFamily: theme.font.fontFamily,
			width: "100%",
		};
		if (buttonType === "cancel") {
			// Material 3 "text" button — no fill at rest, tonal wash on hover.
			return {
				...baseStyle,
				backgroundColor: hover
					? theme.palette.primaryContainer.main
					: "transparent",
				color: theme.palette.titleAccent,
			};
		}
		// Material 3 "filled" button — the primary action.
		return {
			...baseStyle,
			backgroundColor: theme.palette.primary.main,
			color: theme.palette.primary.contrastText,
			boxShadow: theme.elevation.buttonPrimary,
			filter: hover ? "brightness(1.06)" : "none",
		};
	}, [buttonType, hover, theme]);

	return (
		<button
			{...addDataAttr({ dev: { cy: `button-${buttonType}` } })}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={buttonStyle}
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
