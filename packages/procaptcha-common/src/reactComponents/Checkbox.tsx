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
	onChange: () => Promise<void>;
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
	const checkboxStyleBase: CSSProperties = {
		...baseStyle,
		border: `1px solid ${theme.palette.background.contrastText}`,
	};
	const [hover, setHover] = useState(false);

	const ResponsiveLabel = styled.label<ResponsiveLabelProps>`
		color: ${theme.palette.background.contrastText};
		position: relative;
		display: flex;
		cursor: pointer;
		user-select: none;
		
		@container widget (max-width: 219px) {
			display: none;
		}
		@container widget (min-width: 220px) {
			font-size: 12px;
		}
		@container widget (min-width: 250px) {
			font-size: 14px;
		}
		@container widget (min-width: 270px) {
			font-size: 16px;
		}
	`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: TODO fix
	const checkboxStyle: CSSProperties = useMemo(() => {
		return {
			...checkboxStyleBase,
			borderColor: hover
				? theme.palette.background.contrastText
				: theme.palette.border,
			appearance: checked ? "auto" : "none",
			flex: 1,
			margin: "15px",
			minWidth: "28px",
			minHeight: "28px",
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
					css={checkboxBefore}
					type={"checkbox"}
					aria-live={"assertive"}
					aria-label={labelText}
					onChange={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setHover(false);
						onChange();
					}}
					checked={checked}
					style={checkboxStyle}
					disabled={error !== undefined}
					className={loading ? "checkbox__loading-spinner" : ""}
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
