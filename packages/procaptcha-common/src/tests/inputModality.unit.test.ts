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
import { describe, expect, it } from "vitest";
import {
	lastInputWasPointer,
	noteInputMethod,
	watchInputMethod,
} from "../events/inputModality.js";

describe("input modality", () => {
	it("takes the method the framed checkbox reports", () => {
		noteInputMethod(InputMethod.pointer);
		expect(lastInputWasPointer()).toBe(true);

		noteInputMethod(InputMethod.keyboard);
		expect(lastInputWasPointer()).toBe(false);
	});

	it("follows the page's own pointer and key presses once watching", () => {
		watchInputMethod();

		document.dispatchEvent(new Event("pointerdown"));
		expect(lastInputWasPointer()).toBe(true);

		document.dispatchEvent(new Event("keydown"));
		expect(lastInputWasPointer()).toBe(false);
	});
});
