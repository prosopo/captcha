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
export const withAlpha = (hex: string, opacity: number): string => {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// M3 surface roles per mode. Material 3 distinguishes the flat "surface" from
// tonal *surface containers*; components pick the role that matches their
// elevation rather than tinting one base colour. The on-page widget sits on
// surfaceContainerLowest (pure white in light mode) and the challenge dialog on
// surfaceContainerHigh, which is how M3 separates a resting affordance from a
// modal container.
const lightSurface = "#ffffff";
const lightSurfaceContainerHigh = "#ece6f0";
const lightOnSurface = "#1c182b";
// onSurfaceVariant carries secondary text. M3 expresses de-emphasis with this
// role, never by dropping opacity on an onSurface colour.
const lightOnSurfaceVariant = "#49454f";
const darkSurface = "#141218";
const darkSurfaceContainerHigh = "#272233";
const darkOnSurface = "#ece6f5";
const darkOnSurfaceVariant = "#cac4d0";
// Dark-mode accent shared by the checkbox fill and the selected-tile wash
// (brightened from the ramp so the filled state reads on a dark surface).
const darkCheckboxFill = "#7a6fd0";

// M3 state-layer opacities. A state layer is the on-colour laid over the
// container at a fixed alpha — the same three values for every component.
const stateLayer = {
	hover: 0.08,
	focus: 0.1,
	pressed: 0.1,
};

// Elevation is expressed without drop shadows. M3 supports a shadowless
// treatment where separation comes from surface tint plus outline, so every
// level here is "none" and containers rely on their border and surface role to
// read as raised. Kept as tokens so the components stay declarative and a
// shadowed scheme could be reinstated in one place.
const elevationNone = {
	widget: "none",
	widgetHover: "none",
	card: "none",
	buttonPrimary: "none",
};

const elevationLight = elevationNone;
const elevationDark = elevationNone;

// Material 3 shape scale, shared across both themes. Every value is a step on
// the M3 scale (xs 4 / sm 8 / md 12 / lg 16 / xl 28 / full), not an arbitrary
// radius.
const shape = {
	widget: "16px", // large — the on-page "I am human" surface
	card: "28px", // extra-large — M3 dialog container
	header: "12px", // medium — the tonal header "secondary container"
	button: "100px", // full — pill buttons
	tile: "12px", // medium — image grid cells
	tileSelected: "16px", // large — image grid cells when selected
	checkbox: "2px", // M3 checkbox container corner
};

// M3 type scale slices actually used by the widgets. M3 buttons use "label
// large"; the dialog title/body use "title medium" / "body medium".
const typography = {
	labelLarge: {
		fontSize: "0.875rem", // 14dp
		lineHeight: "20px",
		fontWeight: 500,
		letterSpacing: "0.1px",
	},
	titleMedium: {
		fontSize: "1rem", // 16dp
		lineHeight: "24px",
		fontWeight: 500,
		letterSpacing: "0.15px",
	},
	bodyMedium: {
		fontSize: "0.875rem", // 14dp
		lineHeight: "20px",
		fontWeight: 400,
		letterSpacing: "0.25px",
	},
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
			// The dialog container sits on surfaceContainerHigh per M3.
			default: lightSurfaceContainerHigh,
			contrastText: lightOnSurface,
		},
		surface: lightSurface,
		surfaceContainerHigh: lightSurfaceContainerHigh,
		onSurface: lightOnSurface,
		onSurfaceVariant: lightOnSurfaceVariant,
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
		overlay: withAlpha(purple[500], 0.32),
		// Drag-puzzle captcha affordances: target ring, piece and its shadows.
		puzzle: {
			targetBorder: withAlpha(purple[500], 0.55),
			targetFill: withAlpha(purple[500], 0.1),
			pieceGradient: `radial-gradient(circle at 40% 40%, ${purple[300]}, ${purple[500]})`,
		},
		border: purple[100],
		error: {
			main: "#b3261e",
		},
		logoFill: purple[700],
	},
	shape,
	typography,
	stateLayer,
	elevation: elevationLight,
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
			// The dialog container sits on surfaceContainerHigh per M3.
			default: darkSurfaceContainerHigh,
			contrastText: darkOnSurface,
		},
		surface: darkSurface,
		surfaceContainerHigh: darkSurfaceContainerHigh,
		onSurface: darkOnSurface,
		onSurfaceVariant: darkOnSurfaceVariant,
		titleAccent: purple[200],
		checkbox: {
			border: purple[300],
			fill: darkCheckboxFill,
			tick: "#ffffff",
		},
		tile: {
			border: "#2c2742",
		},
		overlay: withAlpha(darkCheckboxFill, 0.5),
		puzzle: {
			targetBorder: withAlpha(purple[200], 0.6),
			targetFill: withAlpha(purple[200], 0.12),
			pieceGradient: `radial-gradient(circle at 40% 40%, ${purple[200]}, ${purple[400]})`,
		},
		border: "#332c50",
		error: {
			main: "#f2b8b5",
		},
		logoFill: "#cfc9e6",
	},
	shape,
	typography,
	stateLayer,
	elevation: elevationDark,
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: FONT_FAMILY,
		color: darkOnSurface,
	},
};
