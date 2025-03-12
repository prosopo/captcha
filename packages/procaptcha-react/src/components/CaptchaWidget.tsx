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
import { ProsopoDatasetError } from "@prosopo/common";
import type { Captcha } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/web-components";
import type { Properties } from "csstype";
import { useMemo } from "react";

export interface CaptchaWidgetProps {
	challenge: Captcha;
	solution: string[];
	onClick: (hash: string) => void;
	themeColor: "light" | "dark";
}

// biome-ignore lint/suspicious/noExplicitAny: TODO fix
const getHash = (item: any) => {
	if (!item.hash) {
		throw new ProsopoDatasetError("CAPTCHA.MISSING_ITEM_HASH", {
			context: { item },
		});
	}
	return item.hash;
};

export const CaptchaWidget = ({
	challenge,
	solution,
	onClick,
	themeColor,
}: CaptchaWidgetProps) => {
	const items = challenge.items;
	const theme = useMemo(
		() => (themeColor === "light" ? lightTheme : darkTheme),
		[themeColor],
	);

	const fullSpacing = `${theme.spacing.unit}px`;
	const halfSpacing = `${theme.spacing.half}px`;

	return (
		<div
			style={{
				// expand to full height / width of parent
				width: "100%",
				height: "100%",
				// display children in flex, spreading them evenly and wrapping when row length exceeded
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				justifyContent: "space-between",
				paddingBottom: halfSpacing,
				paddingRight: halfSpacing,
			}}
		>
			{items.map((item, index) => {
				const hash = getHash(item);
				const imageStyle: Properties<string | number, string> = {
					// enable the items in the grid to grow in width to use up excess space
					flexGrow: 1,
					// make the width of each item 1/3rd of the width overall, i.e. 3 columns
					flexBasis: "33.3333%",
					// include the padding / margin / border in the width
					boxSizing: "border-box",
					paddingLeft: halfSpacing,
					paddingTop: halfSpacing,
				};
				return (
					<div style={imageStyle} key={item.hash}>
						<div
							style={{
								position: "relative",
								cursor: "pointer",
								height: "100%",
								width: "100%",
								border: 1,
								padding: 0,
								margin: 0,
								borderStyle: "solid",
								borderColor: theme.palette.grey[300],
							}}
							onClick={() => onClick(hash)}
						>
							<img
								style={{
									width: "100%", // image should be full width / height of the item
									backgroundColor: theme.palette.grey[300], // colour of the bands when letterboxing and image
									display: "block", // removes whitespace below imgs
									objectFit: "contain", // contain the entire image in the img tag
									aspectRatio: "1/1", // force AR to be 1, letterboxing images with different aspect ratios
									height: "auto", // make the img tag responsive to its container
								}}
								src={item.data}
								// biome-ignore lint/a11y/noRedundantAlt: has to contain image
								alt={`Captcha image ${index + 1}`}
							/>
							<div
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									bottom: 0,
									right: 0,
									height: "100%",
									width: "100%",
									// display overlays in center
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									// make bg half opacity, i.e. shadowing the item's img
									backgroundColor: "rgba(0,0,0,0.5)",
									visibility: solution.includes(hash) ? "visible" : "hidden",
								}}
							>
								<svg
									style={{
										backgroundColor: "transparent",
										// img must be displayed as block otherwise gets a bottom whitespace border
										display: "block",
										// how big the overlay icon is
										width: "35%",
										height: "35%",
										transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
										userSelect: "none",
										fill: "currentcolor",
									}}
									focusable="false"
									color="#fff"
									aria-hidden="true"
									viewBox="0 0 24 24"
									data-testid="CheckIcon"
									aria-label="Check icon"
								>
									<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
								</svg>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
