// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type React from "react";
import {
	type ButtonHTMLAttributes,
	type CSSProperties,
	useMemo,
	useState,
} from "react";
import { darkTheme, lightTheme } from "./theme.js";

interface CheckboxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	themeColor: "light" | "dark";
	checked: boolean;
	onChange: () => void;
	labelText: string;
	error?: string;
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

const responsiveFont = css`
	display: none;
	@media (min-width: 216px) {
		display: flex;
		font-size: 12px;
	}
	@media (min-width: 268px) {
		display: flex;
		font-size: 16px;
	}
`;

export const Checkbox: React.FC<CheckboxProps> = ({
	themeColor,
	onChange,
	checked,
	labelText,
	error,
}: CheckboxProps) => {
	const theme = useMemo(
		() => (themeColor === "light" ? lightTheme : darkTheme),
		[themeColor],
	);
	const checkboxStyleBase: CSSProperties = {
		...baseStyle,
		border: `1px solid ${theme.palette.background.contrastText}`,
	};
	const [hover, setHover] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: TODO fix
	const checkboxStyle: CSSProperties = useMemo(() => {
		return {
			...checkboxStyleBase,
			borderColor: hover
				? theme.palette.background.contrastText
				: theme.palette.grey[400],
			appearance: checked ? "auto" : "none",
			flex: 1,
			margin: "15px",
			minWidth: "14px",
			minHeight: "14px",
		};
	}, [hover, theme, checked]);
	const id = generateRandomId();
	return (
		<span style={{ display: "inline-flex", alignItems: "center" }}>
			<input
				name={id}
				id={id}
				onMouseEnter={() => setHover(true)}
				onMouseLeave={() => setHover(false)}
				css={checkboxBefore}
				type={"checkbox"}
				aria-live={"assertive"}
				aria-label={labelText}
				onChange={onChange}
				checked={checked}
				style={checkboxStyle}
				disabled={error !== undefined}
			/>
			{error ? (
				<label
					css={{
						color: theme.palette.error.main,
						position: "relative",
						display: "flex",
						cursor: "pointer",
						userSelect: "none",
						...responsiveFont,
					}}
					htmlFor={id}
				>
					<a
						css={{
							color: theme.palette.error.main,
						}}
						href={FAQ_LINK}
					>
						{error}
					</a>
				</label>
			) : (
				<label
					css={{
						color: theme.palette.background.contrastText,
						position: "relative",
						display: "flex",
						cursor: "pointer",
						userSelect: "none",
						...responsiveFont,
					}}
					htmlFor={id}
				>
					{labelText}
				</label>
			)}
		</span>
	);
};
export default Checkbox;
