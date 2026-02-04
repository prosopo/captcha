import { isSafariWebKit, isWebKit, isWebKit616OrNewer } from "../utils/browser";
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
import { replaceNaN, toInt } from "../utils/data";

type ScreenResolution = [number | null, number | null];

/**
 * A version of the entropy source with stabilization to make it suitable for static fingerprinting.
 * The window resolution is always the document size in private mode of Safari 17,
 * so the window resolution is not used in Safari 17.
 */
export default function getScreenResolution(): ScreenResolution | undefined {
	if (isWebKit() && isWebKit616OrNewer() && isSafariWebKit()) {
		return undefined;
	}

	return getUnstableScreenResolution();
}

/**
 * A version of the entropy source without stabilization.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
export function getUnstableScreenResolution(): ScreenResolution {
	const s = screen;

	// Some browsers return screen resolution as strings, e.g. "1200", instead of a number, e.g. 1200.
	// I suspect it's done by certain plugins that randomize browser properties to prevent fingerprinting.
	// Some browsers even return  screen resolution as not numbers.
	const parseDimension = (value: unknown) => replaceNaN(toInt(value), null);
	const dimensions = [
		parseDimension(s.width),
		parseDimension(s.height),
	] as ScreenResolution;
	dimensions.sort().reverse();
	return dimensions;
}
