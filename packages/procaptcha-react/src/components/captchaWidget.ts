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
	activationOf,
	applyStyles,
	clearElement,
	createControl,
	createElement,
	createSvgElement,
	threeColumnBasis,
	wrapRandomly,
} from "@prosopo/procaptcha-common";
import type {
	Captcha,
	HashedItem,
	ImageSelection,
	InputMethod,
} from "@prosopo/types";
import {
	type Theme,
	darkTheme,
	lightTheme,
	randomInt,
} from "@prosopo/widget-skeleton";

export interface CaptchaWidgetProps {
	challenge: Captcha;
	solution: ImageSelection[];
	onClick: (
		hash: string,
		x: number,
		y: number,
		inputMethod: InputMethod,
	) => void;
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

const cellStyle = (gap: number): StyleMap => ({
	// enable the items in the grid to grow in width to use up excess space
	flexGrow: 1,
	// make the width of each item 1/3rd of the width overall, i.e. 3 columns
	flexBasis: threeColumnBasis(gap),
	// include the padding / margin / border in the width
	boxSizing: "border-box",
});

const MIN_GRID_GAP = 8;
const MAX_GRID_GAP = 15;
const GRID_PADDING_JITTER = 4;

const MIN_WRAPPER_DEPTH = 0;
const MAX_WRAPPER_DEPTH = 2;

const CHECK_ICON_PATH = "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

/**
 * Asset signing is optional, so both shapes of URL arrive here. An unsigned one
 * gets the cache-buster it always got; a signed one cannot, because its token
 * is a signature over the query string and any addition invalidates it —
 * turning a transient failure into a permanent 403.
 */
const retrySrc = (url: string): string =>
	url.includes("token=")
		? url
		: `${url}${url.includes("?") ? "&" : "?"}retry=${Date.now()}`;

const themeOf = (themeColor: "light" | "dark"): Theme =>
	"light" === themeColor ? lightTheme : darkTheme;

interface GridMetrics {
	readonly gap: number;
	readonly paddingTop: number;
	readonly paddingBottom: number;
}

/** Drawn once per mounted grid, so tile centres move between page loads. */
const generateMetrics = (theme: Theme): GridMetrics => ({
	gap: randomInt(MIN_GRID_GAP, MAX_GRID_GAP),
	paddingTop: Math.max(
		0,
		theme.spacing.unit + randomInt(-GRID_PADDING_JITTER, GRID_PADDING_JITTER),
	),
	paddingBottom: Math.max(
		0,
		theme.spacing.unit + randomInt(-GRID_PADDING_JITTER, GRID_PADDING_JITTER),
	),
});

const gridStyle = (metrics: GridMetrics): StyleMap => ({
	// expand to full height / width of parent
	width: "100%",
	height: "100%",
	// display children in flex, spreading them evenly and wrapping when row length exceeded
	display: "flex",
	flexDirection: "row",
	flexWrap: "wrap",
	justifyContent: "space-between",
	// separates the grid from the instruction header above and the button row
	// below, neither of which pads against it
	paddingTop: `${metrics.paddingTop}px`,
	paddingBottom: `${metrics.paddingBottom}px`,
	gap: `${metrics.gap}px`,
});

// A selected tile shrinks slightly and rounds up a step, so the overlay and
// its badge read as a deliberate state rather than a flat wash.
const selectionStyle = (theme: Theme, selected: boolean): StyleMap => ({
	borderRadius: selected ? theme.shape.tileSelected : theme.shape.tile,
	transform: selected ? "scale(0.9)" : "none",
});

interface Tile {
	readonly hash: string;
	readonly image: HTMLImageElement;
	readonly overlay: HTMLElement;
	readonly clickable: HTMLElement;
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
	let focusedHash: string | null = null;

	const metrics = generateMetrics(themeOf(initialProps.themeColor));

	const grid = createElement("div", { style: gridStyle(metrics) });

	const buildTile = (item: HashedItem, index: number): Tile => {
		const hash = getHash(item);
		const theme = themeOf(props.themeColor);

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
				borderColor: theme.palette.tile.border,
				transition:
					"transform 200ms cubic-bezier(0.2, 0, 0, 1), border-radius 200ms",
			},
			attributes: {
				src: item.data,
				alt: `Captcha image ${index + 1}`,
			},
		});

		teardown.addEventListener(image, "error", () => {
			const retryCount = Number(image.dataset.retryCount ?? "0") + 1;
			image.dataset.retryCount = String(retryCount);
			if (retryCount <= 3) {
				// Clearing it first is what makes the browser re-request a URL
				// it has already seen, which is all a signed URL allows.
				image.removeAttribute("src");
				image.src = retrySrc(item.data);
			}
		});

		const icon = createSvgElement("svg", {
			style: {
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
			},
			attributes: {
				focusable: "false",
				"aria-hidden": "true",
				viewBox: "0 0 24 24",
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
				backgroundColor: theme.palette.overlay,
				borderRadius: theme.shape.tileSelected,
				visibility: "hidden",
			},
			children: [icon],
		});

		// Whichever element the tile is made of, it carries the button role, is
		// in the tab order and is activated by Enter or Space: the tiles are the
		// whole challenge, and one that only a mouse can reach is no challenge at
		// all for a keyboard user.
		//
		// A tap delivers a click too, and the click event carries only
		// clientX/clientY — never `touches` — so there is one set of coordinates
		// to read, not three. Keyboard activation has none, and is reported as
		// keyboard so the provider does not mistake repeated (0, 0) for a bot.
		const clickable = createControl(teardown, {
			style: {
				position: "relative",
				cursor: "pointer",
				height: "100%",
				width: "100%",
				padding: 0,
				margin: 0,
				border: "none",
				background: "none",
				appearance: "none",
				display: "block",
			},
			children: [image, overlay],
			onActivate: (event: MouseEvent | KeyboardEvent) => {
				const { x, y, inputMethod } = activationOf(event);
				props.onClick(hash, x, y, inputMethod);
			},
		});

		// Matched imperatively so the ring is keyboard-only, as the reload
		// button does.
		teardown.addEventListener(clickable, "focus", () => {
			focusedHash = clickable.matches(":focus-visible") ? hash : null;
			applyFocusRing();
		});
		teardown.addEventListener(clickable, "blur", () => {
			focusedHash = null;
			applyFocusRing();
		});

		const cell = createElement("div", {
			style: cellStyle(metrics.gap),
			children: [clickable],
		});
		grid.appendChild(wrapRandomly(cell, MIN_WRAPPER_DEPTH, MAX_WRAPPER_DEPTH));

		return { hash, image, overlay, clickable };
	};

	const applyFocusRing = () => {
		const theme = themeOf(props.themeColor);
		for (const tile of tiles) {
			applyStyles(
				tile.clickable,
				focusedHash === tile.hash
					? {
							outline: `3px solid ${theme.palette.primary.main}`,
							outlineOffset: "2px",
						}
					: { outline: "none", outlineOffset: undefined },
			);
		}
	};

	const rebuild = () => {
		teardown.run();
		teardown = new Teardown();
		clearElement(grid);
		// Re-applied here rather than only at mount: clearing the grid does not
		// touch its own styles, but a rebuild is also where a theme change lands
		// and the metrics must survive it — redrawing them would shift every tile
		// under the user's cursor.
		applyStyles(grid, gridStyle(metrics));
		tiles = props.challenge.items.map(buildTile);
		renderedChallenge = props.challenge;
	};

	const applySelection = () => {
		const theme = themeOf(props.themeColor);
		for (const tile of tiles) {
			const selected = props.solution.some(
				(entry: ImageSelection) => entry[0] === tile.hash,
			);
			applyStyles(tile.image, selectionStyle(theme, selected));
			applyStyles(tile.overlay, {
				visibility: selected ? "visible" : "hidden",
			});
			tile.clickable.setAttribute("aria-pressed", String(selected));
		}
	};

	rebuild();
	applySelection();
	applyFocusRing();
	container.appendChild(grid);

	return {
		update: (nextProps: CaptchaWidgetProps) => {
			const needsRebuild =
				nextProps.challenge !== renderedChallenge ||
				nextProps.themeColor !== props.themeColor;
			props = nextProps;
			if (needsRebuild) {
				// The tiles that carried focus are gone, so the ring has nothing
				// left to track.
				focusedHash = null;
				rebuild();
			}
			applySelection();
			applyFocusRing();
		},
		destroy: () => {
			teardown.run();
			grid.parentNode?.removeChild(grid);
		},
	};
};
