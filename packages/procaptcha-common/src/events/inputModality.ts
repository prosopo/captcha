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

import { InputMethod } from "@prosopo/types";

/**
 * How the user last drove the page. Browsers decide `:focus-visible` from the
 * input their own document has seen, and a click on the framed checkbox lands
 * in the frame's document, so on its own the page takes the next focus move to
 * be a keyboard one and draws a ring on whatever the challenge focuses. The
 * frame reports its activation here to fill that gap.
 */
let lastInputMethod: InputMethod | undefined;
let watching = false;

export const watchInputMethod = (): void => {
	if (watching || "undefined" === typeof document) {
		return;
	}
	watching = true;
	const options: AddEventListenerOptions = { capture: true, passive: true };
	document.addEventListener(
		"pointerdown",
		() => {
			lastInputMethod = InputMethod.pointer;
		},
		options,
	);
	document.addEventListener(
		"keydown",
		() => {
			lastInputMethod = InputMethod.keyboard;
		},
		options,
	);
};

export const noteInputMethod = (inputMethod: InputMethod): void => {
	watchInputMethod();
	lastInputMethod = inputMethod;
};

export const lastInputWasPointer = (): boolean =>
	InputMethod.pointer === lastInputMethod;
