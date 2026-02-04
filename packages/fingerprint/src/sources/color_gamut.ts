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
export type ColorGamut = "srgb" | "p3" | "rec2020";

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/color-gamut
 */
export default function getColorGamut(): ColorGamut | undefined {
	// rec2020 includes p3 and p3 includes srgb
	for (const gamut of ["rec2020", "p3", "srgb"] as const) {
		if (matchMedia(`(color-gamut: ${gamut})`).matches) {
			return gamut;
		}
	}
	return undefined;
}
