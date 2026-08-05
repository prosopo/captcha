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
import {
	type Component,
	type StyleMap,
	Teardown,
	applyStyles,
	clearElement,
	createElement,
	createSvgElement,
} from "@prosopo/procaptcha-common";
import type { Captcha, HashedItem } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";

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

const imageStyle: StyleMap = {
	// enable the items in the grid to grow in width to use up excess space
	flexGrow: 1,
	// make the width of each item 1/3rd of the width overall, i.e. 3 columns
	flexBasis: "calc(33.333% - 10px)",
	// include the padding / margin / border in the width
	boxSizing: "border-box",
};

const CHECK_ICON_PATH = "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

interface Tile {
	readonly hash: string;
	readonly overlay: HTMLElement;
}

/**
 * The selectable image grid.
 *
 * Tiles are rebuilt only when the round's `Captcha` changes identity. Every
 * other update just flips overlay visibility — re-creating `<img>` elements on
 * each selection would restart the image loads and flash the grid, which is the
 * one place the old React reconciler was earning its keep.
 */
export const mountCaptchaWidget = (
	container: HTMLElement,
	initialProps: CaptchaWidgetProps,
): Component<CaptchaWidgetProps> => {
	// Reset on every rebuild so listeners don't accumulate across rounds.
	let teardown = new Teardown();
	let props = initialProps;
	let renderedChallenge: Captcha | undefined;
	let tiles: Tile[] = [];

	const grid = createElement("div", {
		style: {
			// expand to full height / width of parent
			width: "100%",
			height: "100%",
			// display children in flex, spreading them evenly and wrapping when row length exceeded
			display: "flex",
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			gap: "10px",
		},
	});

	const buildTile = (item: HashedItem, index: number): Tile => {
		const hash = getHash(item);
		const theme = "light" === props.themeColor ? lightTheme : darkTheme;

		const image = createElement("img", {
			style: {
				width: "100%", // image should be full width / height of the item
				display: "block", // removes whitespace below imgs
				objectFit: "cover", // contain the entire image in the img tag
				aspectRatio: "1/1", // force AR to be 1, letterboxing images with different aspect ratios
				height: "auto", // make the img tag responsive to its container
				overflow: "hidden",
				borderStyle: "solid",
				borderWidth: "1px",
				borderColor: theme.palette.grey[300],
			},
			attributes: {
				src: item.data,
				alt: `Captcha image ${index + 1}`,
			},
		});

		// A provider that drops a single image request should not cost the user
		// the round: retry a few times with a cache-busting query, then give up.
		// The count lives on the element so it survives re-renders.
		teardown.addEventListener(image, "error", () => {
			const retryCount = Number(image.dataset.retryCount ?? "0") + 1;
			image.dataset.retryCount = String(retryCount);
			if (retryCount <= 3) {
				image.src = `${item.data}?retry=${Date.now()}`;
			}
		});

		const icon = createSvgElement("svg", {
			style: {
				backgroundColor: "transparent",
				// img must be displayed as block otherwise gets a bottom whitespace border
				display: "block",
				// how big the overlay icon is
				width: "35%",
				height: "35%",
				transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
				userSelect: "none",
				fill: "currentcolor",
			},
			attributes: {
				focusable: "false",
				color: "#fff",
				"aria-hidden": "true",
				viewBox: "0 0 24 24",
				"data-testid": "CheckIcon",
				"aria-label": "Check icon",
			},
			children: [
				createSvgElement("path", { attributes: { d: CHECK_ICON_PATH } }),
			],
		});

		const overlay = createElement("div", {
			style: {
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
				visibility: "hidden",
			},
			children: [icon],
		});

		const clickable = createElement("div", {
			style: {
				position: "relative",
				cursor: "pointer",
				height: "100%",
				width: "100%",
				padding: 0,
				margin: 0,
			},
			children: [image, overlay],
		});

		// A tap delivers a click too, and the click event carries only
		// clientX/clientY — never `touches` — so there is one set of coordinates
		// to read, not three.
		teardown.addEventListener(clickable, "click", (event: Event) => {
			if (!event.isTrusted) {
				return;
			}
			const mouseEvent = event as MouseEvent;
			props.onClick(hash, mouseEvent.clientX, mouseEvent.clientY);
		});

		const cell = createElement("div", {
			style: imageStyle,
			children: [clickable],
		});
		grid.appendChild(cell);

		return { hash, overlay };
	};

	const rebuild = () => {
		teardown.run();
		teardown = new Teardown();
		clearElement(grid);
		tiles = props.challenge.items.map(buildTile);
		renderedChallenge = props.challenge;
	};

	const applySelection = () => {
		for (const tile of tiles) {
			applyStyles(tile.overlay, {
				visibility: props.solution.some(
					(selected: [string, number, number]) => selected[0] === tile.hash,
				)
					? "visible"
					: "hidden",
			});
		}
	};

	rebuild();
	applySelection();
	container.appendChild(grid);

	return {
		update: (nextProps: CaptchaWidgetProps) => {
			const needsRebuild =
				nextProps.challenge !== renderedChallenge ||
				nextProps.themeColor !== props.themeColor;
			props = nextProps;
			if (needsRebuild) {
				rebuild();
			}
			applySelection();
		},
		destroy: () => {
			teardown.run();
			grid.parentNode?.removeChild(grid);
		},
	};
};
