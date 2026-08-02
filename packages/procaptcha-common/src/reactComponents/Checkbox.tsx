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
	withAlpha,
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

// 28px container with a 2dp stroke, centred in a 58px touch target. Larger
// than the 18dp M3 checkbox spec — kept at the original size deliberately, as
// the widget needs a more prominent target than a form checkbox.
const CHECKBOX_SIZE = "28px";

const baseStyle: CSSProperties = {
	width: CHECKBOX_SIZE,
	height: CHECKBOX_SIZE,
	minWidth: CHECKBOX_SIZE,
	minHeight: CHECKBOX_SIZE,
	top: "auto",
	left: "auto",
	opacity: "1",
	appearance: "none",
	cursor: "pointer",
	margin: "0",
	borderStyle: "solid",
	borderWidth: "2px",
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

	// M3 focus indicator: a 3dp outline offset by 2dp, drawn only for keyboard
	// focus. The control previously had no focus affordance at all.
	const checkboxFocus = useMemo(
		() => css`
			&:focus-visible {
				outline: 3px solid ${theme.palette.primary.main};
				outline-offset: 2px;
			}
		`,
		[theme],
	);

	const ResponsiveLabel = styled.label<ResponsiveLabelProps>`
		/* The label sits on the widget surface, so it takes onSurface — not the
		   dialog container's on-colour. */
		color: ${theme.palette.onSurface};
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
		const tickColor = encodeURIComponent(theme.palette.checkbox.tick);
		const checkImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='${tickColor}' d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E")`;
		// M3 hover feedback is a state layer — the on-colour at 8% expressed as a
		// spread ring around the container — not a change of stroke colour.
		const stateLayerColor = checked
			? theme.palette.checkbox.fill
			: theme.palette.onSurface;
		return {
			...baseStyle,
			// 15px each side around a 28px box gives a 58px touch target.
			margin: "15px",
			borderRadius: theme.shape.checkbox,
			borderColor: checked
				? theme.palette.checkbox.fill
				: theme.palette.checkbox.border,
			backgroundColor: checked
				? theme.palette.checkbox.fill
				: theme.palette.surface,
			backgroundImage: checked ? checkImage : "none",
			backgroundRepeat: "no-repeat",
			backgroundPosition: "center",
			// Tick inset within the 28px container.
			backgroundSize: "20px 20px",
			boxShadow: hover
				? `0 0 0 10px ${withAlpha(stateLayerColor, theme.stateLayer.hover)}`
				: "none",
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
					css={[checkboxBefore, checkboxForcedColors, checkboxFocus]}
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
