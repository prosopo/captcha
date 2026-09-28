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
 * Names and shapes that differ on every page load, so nothing inside the widget
 * can be reached by a selector written down in advance.
 *
 * These are not secrets, and `Math.random` is the right source for them. An
 * attacker has to load the page to interact with the widget, and once loaded
 * the names are simply there to read — so a name being predictable costs
 * nothing, while a name being the same twice costs everything. Drawing them
 * from `crypto` would claim a guarantee the widget neither needs nor has, and
 * squeezing a cryptographic draw into a range this small is a documented way
 * to introduce bias (CodeQL js/biased-cryptographic-random).
 */

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHANUMERICS = `${LETTERS}0123456789`;

/** An integer in [0, bound). */
const randomBelow = (bound: number): number =>
	Math.floor(Math.random() * bound);

const at = (alphabet: string): string =>
	alphabet[randomBelow(alphabet.length)] ?? "a";

/**
 * A token usable both as a CSS class and as an HTML id, so it never starts with
 * a digit.
 */
export const randomToken = (length = 8): string =>
	Array.from({ length }, (_unused: unknown, index: number) =>
		0 === index ? at(LETTERS) : at(ALPHANUMERICS),
	).join("");

/** An integer in [min, max]. */
export const randomInt = (min: number, max: number): number =>
	min + randomBelow(max - min + 1);

/**
 * Only elements that map to no accessible role, so varying the tag cannot
 * introduce a landmark a screen reader would announce.
 */
const WRAPPER_TAGS = ["div", "span"] as const;

export type WrapperTag = (typeof WRAPPER_TAGS)[number];

export const randomWrapperTag = (): WrapperTag =>
	WRAPPER_TAGS[randomInt(0, WRAPPER_TAGS.length - 1)] ?? "div";

export const randomTokens = (count: number): string[] =>
	Array.from({ length: count }, () => randomToken());
