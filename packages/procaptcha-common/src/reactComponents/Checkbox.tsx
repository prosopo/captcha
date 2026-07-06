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

import { css } from "@emotion/react";
import styled from "@emotion/styled";
import {
	type Theme,
	WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
} from "@prosopo/widget-skeleton";
import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	type FC,
	useMemo,
	useState,
} from "react";

interface CheckboxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	theme: Theme;
	checked: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: don't know what it will be
	onChange: (event: any) => Promise<void>;
	labelText: string;
	error?: string;
	loading: boolean;
}

const checkboxBefore = css`{
    &:before {
        content: '""';
        position: absolute;
        height: 100%;
        width: 100%;
    }
}`;

// In forced-colors mode (Windows High Contrast) backgrounds are overridden, so
// the custom-painted tick can disappear — fall back to the native control,
// which the OS draws in system colors. !important beats the inline styles.
const checkboxForcedColors = css`
	@media (forced-colors: active) {
		appearance: auto !important;
		background-image: none !important;
	}
`;

const baseStyle: CSSProperties = {
	width: "28px",
	height: "28px",
	minWidth: "14px",
	minHeight: "14px",
	top: "auto",
	left: "auto",
	opacity: "1",
	borderRadius: "12.5%",
	appearance: "none",
	cursor: "pointer",
	margin: "0",
	borderStyle: "solid",
	borderWidth: "1px",
};

const ID_LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const FAQ_LINK = process.env.PROSOPO_DOCS_URL
	? `${new URL(`${process.env.PROSOPO_DOCS_URL}/en/basics/faq/`).href}/`
	: "https://docs.prosopo.io/en/basics/faq/";

const generateRandomId = () => {
	return Array.from(
		{ length: 8 },
		() => ID_LETTERS[Math.floor(Math.random() * ID_LETTERS.length)],
	).join("");
};

interface ResponsiveLabelProps {
	htmFor?: string;
}

export const Checkbox: FC<CheckboxProps> = ({
	theme,
	onChange,
	checked,
	labelText,
	error,
	loading,
}: CheckboxProps) => {
	const [hover, setHover] = useState(false);

	const ResponsiveLabel = styled.label<ResponsiveLabelProps>`
		color: ${theme.palette.background.contrastText};
		position: relative;
		display: flex !important;
		cursor: pointer;
		user-select: none;
		font-weight: normal;
		font-family: ${theme.font.fontFamily};
		@container prosopo-widget (max-width: 169px) {
			display: none;
		}
		@container prosopo-widget (min-width: 170px) {
			font-size: 10px;
		}
		@container prosopo-widget (min-width: 220px) {
			font-size: 12px;
		}
		@container prosopo-widget (min-width: 250px) {
			font-size: 14px;
		}
		@container prosopo-widget (min-width: 270px) {
			font-size: 16px;
		}
	`;

	const checkboxStyle: CSSProperties = useMemo(() => {
		// White (token) tick painted directly onto the box so the checked state is
		// identical in light and dark mode — the native control can't be themed.
		const tickColor = theme.palette.checkbox.tick.replace("#", "%23");
		const checkImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='${tickColor}' d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E")`;
		return {
			...baseStyle,
			flex: 1,
			margin: "15px",
			minWidth: "28px",
			minHeight: "28px",
			borderRadius: "8px",
			borderWidth: "2px",
			borderColor: checked
				? theme.palette.checkbox.fill
				: hover
					? theme.palette.primary.main
					: theme.palette.checkbox.border,
			backgroundColor: checked
				? theme.palette.checkbox.fill
				: theme.palette.surface,
			backgroundImage: checked ? checkImage : "none",
			backgroundRepeat: "no-repeat",
			backgroundPosition: "center",
			backgroundSize: "20px 20px",
			transition:
				"background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
		};
	}, [hover, theme, checked]);
	const id = generateRandomId();

	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				minHeight: "58px",
			}}
		>
			{loading ? (
				<div
					className={WIDGET_CHECKBOX_SPINNER_CSS_CLASS}
					aria-label="Loading spinner"
				/>
			) : (
				<input
					name={id}
					id={id}
					onMouseEnter={() => setHover(true)}
					onMouseLeave={() => setHover(false)}
					css={[checkboxBefore, checkboxForcedColors]}
					type={"checkbox"}
					aria-live={"assertive"}
					aria-label={labelText}
					onKeyDown={(e) => {
						if (!e.isTrusted) {
							return;
						}
						if (e.key === "Enter") {
							e.preventDefault();
							e.stopPropagation();
							setHover(false);
							onChange(e);
						}
					}}
					onChange={(e) => {
						if (!e.isTrusted) {
							return;
						}
						e.preventDefault();
						e.stopPropagation();
						setHover(false);
						onChange(e);
					}}
					checked={checked}
					style={checkboxStyle}
					disabled={error !== undefined}
					className={loading ? "prosopo-checkbox__loading-spinner" : ""}
					data-cy={"captcha-checkbox"}
				/>
			)}
			{error ? (
				<ResponsiveLabel htmFor={id}>
					<a
						css={{
							color: theme.palette.error.main,
						}}
						href={FAQ_LINK}
					>
						{error}
					</a>
				</ResponsiveLabel>
			) : (
				<ResponsiveLabel htmFor={id}>{labelText}</ResponsiveLabel>
			)}
		</span>
	);
};
export default Checkbox;
