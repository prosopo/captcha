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

// Prosopo brand purple ramp. The widgets are styled in a Material 3 "tonal"
// key off this single hue — tonal container surfaces + a saturated primary,
// mirrored into a dark plum scheme for dark mode.
const purple = {
	50: "#EDECF5",
	100: "#DCD9EC",
	200: "#B8B4D9",
	300: "#8C85C1",
	400: "#695FAD",
	500: "#4E439F",
	600: "#423987",
	700: "#332C67",
	800: "#1F1B40",
	900: "#100D20",
};

const DEFAULT_SPACING = 10; // size in pixels

const FONT_FAMILY =
	'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

// Alpha washes derive from ramp hexes via this helper so they can't drift
// from the solid colors they are tints of.
const alpha = (hex: string, opacity: number): string => {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// M3 surface pair per mode. background.default and font.color reference these
// so the on-page widget, the challenge card and body text can never desync.
const lightSurface = "#f8f6fd";
const lightOnSurface = "#1c182b";
const darkSurface = "#1a1623";
const darkOnSurface = "#ece6f5";
// Dark-mode accent shared by the checkbox fill and the selected-tile wash
// (brightened from the ramp so the filled state reads on a dark surface).
const darkCheckboxFill = "#7a6fd0";

// Material 3 shape scale, reined in — gently rounded rather than fully round.
const shape = {
	widget: "8px", // the on-page "I am human" surface
	card: "12px", // the challenge dialog container
	header: "8px", // the tonal header "secondary container"
	button: "8px", // softly rounded action buttons (no longer full pills)
	tile: "6px", // image grid cells
	tileSelected: "8px", // image grid cells when selected
};

export type Theme = typeof lightTheme | typeof darkTheme;

export const lightTheme = {
	palette: {
		mode: "light",
		primary: {
			main: purple[500],
			contrastText: "#ffffff",
		},
		// M3 tonal "secondary container" — a soft tint of the primary used for the
		// challenge header and the reload affordance.
		primaryContainer: {
			main: purple[100],
			contrastText: purple[800],
			// ~8% on-color state layer over main: the hover fill for tonal controls.
			hover: "#cdcade",
		},
		background: {
			default: lightSurface,
			contrastText: lightOnSurface,
		},
		surface: lightSurface,
		onSurface: lightOnSurface,
		// Bold "target word" in the challenge header.
		titleAccent: purple[600],
		// The checkbox is fully custom-painted (works identically in dark mode).
		checkbox: {
			border: purple[400],
			fill: purple[500],
			tick: "#ffffff",
		},
		// Image grid tiles.
		tile: {
			border: "#e7e2f3",
		},
		// Semi-transparent wash over a selected image tile.
		overlay: alpha(purple[500], 0.32),
		// Drag-puzzle captcha affordances: target ring, piece and its shadows.
		puzzle: {
			targetBorder: alpha(purple[500], 0.55),
			targetFill: alpha(purple[500], 0.1),
			pieceGradient: `radial-gradient(circle at 40% 40%, ${purple[300]}, ${purple[500]})`,
			pieceShadow: `0 2px 6px ${alpha(purple[500], 0.35)}`,
			pieceShadowDrag: `0 4px 12px ${alpha(purple[500], 0.55)}`,
		},
		border: purple[100],
		error: {
			main: "#b3261e",
		},
		logoFill: purple[700],
	},
	shape,
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: FONT_FAMILY,
		color: lightOnSurface,
	},
};

export const darkTheme = {
	palette: {
		mode: "dark",
		primary: {
			// M3 dark uses a lighter tone of the source hue as the accent.
			main: purple[300],
			contrastText: purple[900],
		},
		primaryContainer: {
			main: "#2a2550",
			contrastText: purple[100],
			// ~8% on-color state layer over main: the hover fill for tonal controls.
			hover: "#38335d",
		},
		background: {
			// Dark plum M3 surface rather than neutral grey.
			default: darkSurface,
			contrastText: darkOnSurface,
		},
		surface: darkSurface,
		onSurface: darkOnSurface,
		titleAccent: purple[200],
		checkbox: {
			border: purple[300],
			fill: darkCheckboxFill,
			tick: "#ffffff",
		},
		tile: {
			border: "#2c2742",
		},
		overlay: alpha(darkCheckboxFill, 0.5),
		puzzle: {
			targetBorder: alpha(purple[200], 0.6),
			targetFill: alpha(purple[200], 0.12),
			pieceGradient: `radial-gradient(circle at 40% 40%, ${purple[200]}, ${purple[400]})`,
			pieceShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
			pieceShadowDrag: "0 4px 12px rgba(0, 0, 0, 0.6)",
		},
		border: "#332c50",
		error: {
			main: "#f2b8b5",
		},
		logoFill: "#cfc9e6",
	},
	shape,
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: FONT_FAMILY,
		color: darkOnSurface,
	},
};
