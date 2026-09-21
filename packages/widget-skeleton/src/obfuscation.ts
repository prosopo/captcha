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
 * None of this needs to be unguessable — an attacker reads the rendered DOM
 * either way. It only needs to differ between loads, which is why the seed is
 * local rather than served by the provider: a provider-supplied one would have
 * to arrive before first paint.
 */

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHANUMERICS = `${LETTERS}0123456789`;

const POOL = 0x1_0000_0000;

/**
 * `crypto` is absent under a few older embedded webviews, and a widget that
 * failed to render there would be a worse outcome than a weaker shuffle.
 */
const randomUint32 = (): number => {
	const source = globalThis.crypto;
	if (undefined === source || undefined === source.getRandomValues) {
		return Math.floor(Math.random() * POOL);
	}
	return source.getRandomValues(new Uint32Array(1))[0] ?? 0;
};

/**
 * A uniform integer in [0, bound).
 *
 * The pool divides into `bound` equal buckets with a remainder; a draw landing
 * in that remainder is taken again rather than folded back in, which is what
 * mapping the whole pool onto the range would do — making the low end of it
 * likelier than the high end.
 */
const randomBelow = (bound: number): number => {
	const bucket = Math.floor(POOL / bound);
	const limit = bucket * bound;
	let value = randomUint32();
	while (value >= limit) {
		value = randomUint32();
	}
	return Math.floor(value / bucket);
};

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
