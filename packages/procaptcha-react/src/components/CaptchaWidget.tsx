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

	const isTouchDevice = "ontouchstart" in window;

	// Assumes a 3x3 grid, could be made more generic
	const fullSpacing = `${theme.spacing.unit}px`;
	const halfSpacing = `${theme.spacing.half}px`;
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	const paddingForImageColumns: { [key: number]: any } = {
		0: {
			paddingLeft: 0,
			paddingRight: halfSpacing,
			paddingTop: halfSpacing,
			paddingBottom: halfSpacing,
		},
		1: {
			paddingLeft: halfSpacing,
			paddingRight: halfSpacing,
			paddingTop: halfSpacing,
			paddingBottom: halfSpacing,
		},
		2: {
			paddingLeft: halfSpacing,
			paddingRight: 0,
			paddingTop: halfSpacing,
			paddingBottom: halfSpacing,
		},
	};

	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	const paddingForImageRows: { [key: number]: any } = {
		0: { paddingTop: fullSpacing },
		2: { paddingBottom: fullSpacing },
	};

	return (
		<div
			style={{
				paddingRight: 0.5,
				paddingBottom: 0.5,
				// expand to full height / width of parent
				width: "100%",
				height: "100%",
				// display children in flex, spreading them evenly and wrapping when row length exceeded
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
			}}
		>
			{items.map((item, index) => {
				const hash = getHash(item);
				const imageStyle: Properties<string | number, string> = {
					...paddingForImageColumns[index % 3],
					...paddingForImageRows[Math.floor(index / 3)],
					// enable the items in the grid to grow in width to use up excess space
					flexGrow: 1,
					// make the width of each item 1/3rd of the width overall, i.e. 3 columns
					flexBasis: "33.3333%",
					// include the padding / margin / border in the width
					boxSizing: "border-box",
				};
				return (
					<div style={imageStyle} key={item.hash}>
						<div
							style={{
								cursor: "pointer",
								height: "100%",
								width: "100%",
								border: 1,
								borderStyle: "solid",
								borderColor: theme.palette.grey[300],
							}}
							onClick={isTouchDevice ? undefined : () => onClick(hash)}
							onTouchStart={isTouchDevice ? () => onClick(hash) : undefined}
						>
							<div>
								<img
									style={{
										width: "100%", // image should be full width / height of the item
										backgroundColor: theme.palette.grey[300], // colour of the bands when letterboxing and image
										opacity:
											solution.includes(hash) && isTouchDevice ? "50%" : "100%", // iphone workaround
										display: "block", // removes whitespace below imgs
										objectFit: "contain", // contain the entire image in the img tag
										aspectRatio: "1/1", // force AR to be 1, letterboxing images with different aspect ratios
										height: "auto", // make the img tag responsive to its container
									}}
									src={item.data}
									// biome-ignore lint/a11y/noRedundantAlt: has to contain image
									alt={`Captcha image ${index + 1}`}
								/>
							</div>

							<div
								style={{
									// relative to where the element _should_ be positioned
									position: "relative",
									// make the overlay the full height/width of an item
									width: "100%",
									height: "100%",
									// shift it up 100% to overlay the item element
									top: "-100%",
									visibility: solution.includes(hash) ? "visible" : "hidden",
									// transition on opacity upon (de)selection
									transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
									opacity: 1,
								}}
							>
								<div
									style={{
										// make the overlay absolute positioned compare to its container
										position: "absolute",
										// spread across 100% width/height of the item box
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
					</div>
				);
			})}
		</div>
	);
};
