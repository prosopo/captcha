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
const maxValueToCheck = 100;

/**
 * If the display is monochrome (e.g. black&white), the value will be ≥0 and will mean the number of bits per pixel.
 * If the display is not monochrome, the returned value will be 0.
 * If the browser doesn't support this feature, the returned value will be undefined.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/monochrome
 */
export default function getMonochromeDepth(): number | undefined {
	if (!matchMedia("(min-monochrome: 0)").matches) {
		// The media feature isn't supported by the browser
		return undefined;
	}

	// A variation of binary search algorithm can be used here.
	// But since expected values are very small (≤10), there is no sense in adding the complexity.
	for (let i = 0; i <= maxValueToCheck; ++i) {
		if (matchMedia(`(max-monochrome: ${i})`).matches) {
			return i;
		}
	}

	throw new Error("Too high value");
}
