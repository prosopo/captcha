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

const grey = {
	0: "#fff",
	100: "#f5f5f5",
	200: "#eeeeee",
	300: "#e0e0e0",
	400: "#bdbdbd",
	500: "#9e9e9e",
	600: "#757575",
	700: "#616161",
	800: "#424242",
	900: "#212121",
};

// Prosopo brand purple ramp (packages/portal/tailwind.config.js). The widgets
// are styled in a Material 3 "tonal" key off this single hue — tonal container
// surfaces + a saturated primary, mirrored into a dark plum scheme for dark mode.
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
		},
		background: {
			// Doubles as the M3 surface for the widget + challenge card.
			default: "#f8f6fd",
			contrastText: "#1c182b",
		},
		surface: "#f8f6fd",
		onSurface: "#1c182b",
		muted: "#6f6890",
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
		overlay: "rgba(78, 67, 159, 0.32)",
		border: purple[100],
		error: {
			main: "#b3261e",
		},
		logoFill: purple[700],
		grey,
		purple,
	},
	shape,
	// Flat by design — borders, not drop shadows, separate the surfaces.
	elevation: {
		widget: "none",
		widgetHover: "none",
		card: "none",
		buttonPrimary: "none",
	},
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: FONT_FAMILY,
		color: "#1c182b",
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
		},
		background: {
			// Dark plum M3 surface rather than neutral grey.
			default: "#1a1623",
			contrastText: "#ece6f5",
		},
		surface: "#1a1623",
		onSurface: "#ece6f5",
		muted: "#a79fc4",
		titleAccent: purple[200],
		checkbox: {
			// Brightened a touch so the filled state reads on a dark surface.
			border: purple[300],
			fill: "#7a6fd0",
			tick: "#ffffff",
		},
		tile: {
			border: "#2c2742",
		},
		overlay: "rgba(124, 111, 208, 0.5)",
		border: "#332c50",
		error: {
			main: "#f2b8b5",
		},
		logoFill: "#cfc9e6",
		grey,
		purple,
	},
	shape,
	// Flat by design — borders, not drop shadows, separate the surfaces.
	elevation: {
		widget: "none",
		widgetHover: "none",
		card: "none",
		buttonPrimary: "none",
	},
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: FONT_FAMILY,
		color: "#ece6f5",
	},
};
