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
export enum ContrastPreference {
	Less = -1,
	None = 0,
	More = 1,
	// "Max" can be added in future
	ForcedColors = 10,
}

/**
 * @see https://www.w3.org/TR/mediaqueries-5/#prefers-contrast
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
 */
export default function getContrastPreference(): number | undefined {
	if (doesMatch("no-preference")) {
		return ContrastPreference.None;
	}
	// The sources contradict on the keywords. Probably 'high' and 'low' will never be implemented.
	// Need to check it when all browsers implement the feature.
	if (doesMatch("high") || doesMatch("more")) {
		return ContrastPreference.More;
	}
	if (doesMatch("low") || doesMatch("less")) {
		return ContrastPreference.Less;
	}
	if (doesMatch("forced")) {
		return ContrastPreference.ForcedColors;
	}
	return undefined;
}

function doesMatch(value: string) {
	return matchMedia(`(prefers-contrast: ${value})`).matches;
}
