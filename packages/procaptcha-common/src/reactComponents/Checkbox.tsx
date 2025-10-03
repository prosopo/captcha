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

import styled from "@emotion/styled";
import type { Theme } from "@prosopo/widget-skeleton";
import { type ButtonHTMLAttributes, type FC, useState } from "react";

interface CheckboxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	theme: Theme;
	checked: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: don't know what it will be
	onChange: (event: any) => Promise<void>;
	labelText: string;
	error?: string;
	loading: boolean;
}

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
				<svg
					viewBox="0 0 50 50"
					aria-label="Loading spinner"
					style={{
						width: "28px",
						height: "28px",
						margin: "15px",
						animation: "spinner-rotation 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
					}}
				>
					<circle
						cx="25"
						cy="25"
						r="20"
						fill="none"
						strokeWidth="4"
						strokeLinecap="round"
						stroke={theme.palette.background.contrastText}
						strokeDasharray="90, 150"
						strokeDashoffset="0"
						style={{
							animation: "spinner-dash 1.5s ease-in-out infinite",
						}}
					/>
					<style>
						{`
							@keyframes spinner-rotation {
								0% { transform: rotate(0deg); }
								100% { transform: rotate(360deg); }
							}
							@keyframes spinner-dash {
								0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
								50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
								100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
							}
						`}
					</style>
				</svg>
			) : (
				<button
					name={id}
					id={id}
					onMouseEnter={() => setHover(true)}
					onMouseLeave={() => setHover(false)}
					type="button"
					role="checkbox"
					aria-checked={checked}
					aria-live="assertive"
					aria-label={labelText}
					onKeyDown={(e) => {
						if (!e.isTrusted) {
							return;
						}
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							e.stopPropagation();
							setHover(false);
							onChange(e);
						}
					}}
					onClick={(e) => {
						if (!e.isTrusted) {
							return;
						}
						e.preventDefault();
						e.stopPropagation();
						setHover(false);
						onChange(e);
					}}
					disabled={error !== undefined}
					data-cy="captcha-checkbox"
					style={{
						width: "28px",
						height: "28px",
						minWidth: "28px",
						minHeight: "28px",
						margin: "15px",
						padding: "0",
						border: "none",
						background: "transparent",
						cursor: error ? "not-allowed" : "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{
							width: "100%",
							height: "100%",
							display: "block",
						}}
					>
						<rect
							x="3"
							y="3"
							width="18"
							height="18"
							rx="3"
							fill="none"
							stroke={
								hover
									? theme.palette.background.contrastText
									: theme.palette.border
							}
							strokeWidth="2"
						/>
						{checked && (
							<path
								d="M7 12 L10 15 L17 8"
								fill="none"
								stroke={theme.palette.background.contrastText}
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						)}
					</svg>
				</button>
			)}
			{error ? (
				<ResponsiveLabel htmlFor={id}>
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
				<ResponsiveLabel htmlFor={id}>{labelText}</ResponsiveLabel>
			)}
		</span>
	);
};
export default Checkbox;
