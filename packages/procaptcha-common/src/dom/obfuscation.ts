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
 * Shapes that differ on every page load, so nothing a challenge renders can be
 * reached by a selector written down in advance. The names these build on come
 * from `@prosopo/widget-skeleton`'s obfuscation module, which explains why
 * `Math.random` is the right source for them.
 */

import {
	randomInt,
	randomToken,
	randomWrapperTag,
} from "@prosopo/widget-skeleton";
import { isEventTrusted } from "../events/trust.js";
import type { Teardown } from "./component.js";
import { type AttributeMap, type StyleMap, createElement } from "./element.js";

/**
 * Nests a node in a random number of randomly named, randomly tagged wrappers
 * and hands back the outermost one for the caller to append.
 *
 * `display: contents` is what makes the depth free: the wrappers generate no
 * boxes, so the node stays the flex item its parent laid out before, however
 * many of them the current render produced. Only elements with no accessible
 * role are used, so a screen reader is told nothing new either.
 */
export const wrapRandomly = (
	innermost: HTMLElement,
	min: number,
	max: number,
): HTMLElement => {
	let outermost = innermost;
	for (let depth = randomInt(min, max); depth > 0; depth -= 1) {
		outermost = createElement(randomWrapperTag(), {
			className: randomToken(),
			style: { display: "contents" },
			children: [outermost],
		});
	}
	return outermost;
};

/**
 * The flex basis an item needs to sit three-to-a-row with `gap` between them:
 * each gives up two thirds of a gap.
 *
 * A function of the gap rather than a constant beside it, because the gap is
 * drawn per mount and a basis that does not track it wraps the row — four rows
 * of images where there should be three.
 */
export const threeColumnBasis = (gap: number): string =>
	`calc(33.333% - ${Math.round((200 * gap) / 3) / 100}px)`;

/**
 * Which element an activatable control is made of. A challenge draws this per
 * control, so `button` is not a selector that finds every control in the
 * dialog.
 */
export type ControlKind = "button" | "generic";

const CONTROL_KINDS: readonly ControlKind[] = ["button", "generic"];

export const randomControlKind = (): ControlKind =>
	CONTROL_KINDS[randomInt(0, CONTROL_KINDS.length - 1)] ?? "button";

export interface ControlOptions {
	/** Drawn at random when omitted. Passed explicitly only by tests. */
	kind?: ControlKind;
	className?: string;
	style?: StyleMap;
	attributes?: AttributeMap;
	text?: string;
	children?: readonly Node[];
	onActivate: (event: MouseEvent | KeyboardEvent) => void;
}

const ACTIVATION_KEYS: readonly string[] = ["Enter", " "];

/**
 * A control that is either a real `<button>` or a generic element carrying the
 * button role, chosen per control.
 *
 * The two are equivalent to use: the generic one is in the tab order, is
 * activated by Enter and Space, and is found by the challenge surface's focus
 * trap, which matches `[tabindex]:not([tabindex="-1"])`. What a `<button>` gives
 * for free has to be written out here, which is the whole cost of the variant.
 *
 * Activation is gated on the event being trusted, as every other control in the
 * widget is: a script-dispatched click is how a solver drives the page.
 */
export const createControl = (
	teardown: Teardown,
	options: ControlOptions,
): HTMLElement => {
	const {
		kind = randomControlKind(),
		onActivate,
		attributes,
		...rest
	} = options;
	const isButton = "button" === kind;

	const control = isButton
		? createElement("button", {
				...rest,
				attributes: { type: "button", ...attributes },
			})
		: createElement("div", {
				...rest,
				attributes: { role: "button", tabindex: "0", ...attributes },
			});

	teardown.addEventListener(control, "click", (event: Event) => {
		if (!isEventTrusted(event)) {
			return;
		}
		onActivate(event as MouseEvent);
	});

	if (isButton) {
		return control;
	}

	teardown.addEventListener(control, "keydown", (event: Event) => {
		const keyboardEvent = event as KeyboardEvent;
		if (!ACTIVATION_KEYS.includes(keyboardEvent.key)) {
			return;
		}
		if (!isEventTrusted(keyboardEvent)) {
			return;
		}
		// Space scrolls the dialog otherwise, which is what the button element
		// suppresses on our behalf in the other variant.
		keyboardEvent.preventDefault();
		onActivate(keyboardEvent);
	});

	return control;
};
