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

const DEFAULT_SPACING = 10; // size in pixels

export const lightTheme = {
	palette: {
		mode: "light",
		primary: {
			main: "#487DFA",
			contrastText: "#fff",
		},
		background: {
			default: "#fff",
			contrastText: "#000",
		},
		error: {
			main: "#f44336",
		},

		grey,
	},
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
		color: "#000",
	}
};

export const darkTheme = {
	palette: {
		mode: "dark",
		primary: {
			main: "#487DFA",
			contrastText: "#fff",
		},
		background: {
			default: "#303030",
			contrastText: "#fff",
		},
		error: {
			main: "#f44336",
		},
		grey,
	},
	spacing: {
		unit: DEFAULT_SPACING,
		half: Math.floor(DEFAULT_SPACING / 2),
	},
	font: {
		fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
		color: "#fff",
	}
};
