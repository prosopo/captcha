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
import { ProsopoDatasetError } from "@prosopo/common";
import type { Captcha, HashedItem } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import type { Properties } from "csstype";
import type React from "react";
import { useMemo } from "react";

export interface CaptchaWidgetProps {
	challenge: Captcha;
	solution: [string, number, number][];
	onClick: (hash: string, x: number, y: number) => void;
	themeColor: "light" | "dark";
}

// The type promises a hash, but the items arrive over the wire, so a
// malformed one is still worth rejecting loudly rather than rendering a tile
// that can never be selected.
const getHash = (item: HashedItem): string => {
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
				paddingBottom: fullSpacing,
				paddingTop: fullSpacing,
				gap: "10px",
			}}
		>
			{items.map((item, index) => {
				const hash = getHash(item);
				const selected = solution.some((s) => s[0] === hash);
				const imageStyle: Properties<string | number, string> = {
					// enable the items in the grid to grow in width to use up excess space
					flexGrow: 1,
					// make the width of each item 1/3rd of the width overall, i.e. 3 columns
					flexBasis: "calc(33.333% - 10px)",
					// include the padding / margin / border in the width
					boxSizing: "border-box",
				};
				return (
					<div style={imageStyle} key={item.hash}>
						<div
							style={{
								position: "relative",
								cursor: "pointer",
								height: "100%",
								width: "100%",
								padding: 0,
								margin: 0,
							}}
							// A tap delivers a click too, and React's synthetic click
							// carries only clientX/clientY — never `touches` — so
							// there is one set of coordinates to read, not three.
							onClick={(e: React.MouseEvent) => {
								if (!e.isTrusted) {
									return;
								}
								onClick(hash, e.clientX, e.clientY);
							}}
						>
							<img
								style={{
									width: "100%", // image should be full width / height of the item
									display: "block", // removes whitespace below imgs
									objectFit: "cover", // contain the entire image in the img tag
									aspectRatio: "1/1", // force AR to be 1, letterboxing images with different aspect ratios
									height: "auto", // make the img tag responsive to its container
									overflow: "hidden",
									borderStyle: "solid",
									borderWidth: "1px",
									borderColor: theme.palette.tile.border,
									borderRadius: selected
										? theme.shape.tileSelected
										: theme.shape.tile,
									transform: selected ? "scale(0.9)" : "none",
									transition:
										"transform 200ms cubic-bezier(0.2, 0, 0, 1), border-radius 200ms",
								}}
								src={item.data}
								// biome-ignore lint/a11y/noRedundantAlt: has to contain image
								alt={`Captcha image ${index + 1}`}
								// A provider that drops a single image request should not
								// cost the user the round: retry a few times with a
								// cache-busting query, then give up. The count lives on
								// the element so it survives re-renders.
								onError={(e) => {
									const target = e.currentTarget;
									const retryCount =
										Number(target.dataset.retryCount ?? "0") + 1;
									target.dataset.retryCount = String(retryCount);
									if (retryCount <= 3) {
										target.src = `${item.data}?retry=${Date.now()}`;
									}
								}}
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
									backgroundColor: theme.palette.overlay,
									borderRadius: theme.shape.tileSelected,
									visibility: selected ? "visible" : "hidden",
								}}
							>
								<svg
									style={{
										// rounded "secondary container" badge holding the tick
										backgroundColor: theme.palette.checkbox.fill,
										// img must be displayed as block otherwise gets a bottom whitespace border
										display: "block",
										// how big the overlay badge is
										width: "34px",
										height: "34px",
										padding: "7px",
										borderRadius: "50%",
										boxSizing: "border-box",
										transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
										userSelect: "none",
										fill: theme.palette.checkbox.tick,
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
