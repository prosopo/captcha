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

/**
 * Whether the pointer driving this page can hover.
 *
 * A hover state layer is free on a desktop and expensive on a phone. iOS
 * Safari treats a first tap that changes what is under the finger as a request
 * to *show* the hover state rather than to activate the control, and withholds
 * the click — so the visitor taps the checkbox, watches it light up, and has to
 * tap again. Android browsers do the same thing in places. Drawing the state
 * layer only where a pointer can actually rest on something costs a
 * touch-screen visitor nothing and gives them back their first tap.
 *
 * Defaults to hovering when `matchMedia` is missing. That is the desktop-shaped
 * guess, and the only environments without it are old browsers and test DOMs;
 * every touch browser has had it for a decade.
 */
export const canHover = (): boolean => {
	if ("function" !== typeof globalThis.matchMedia) {
		return true;
	}
	return globalThis.matchMedia("(hover: hover)").matches;
};
