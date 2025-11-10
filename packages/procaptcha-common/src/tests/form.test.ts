// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { ApiParams } from "@prosopo/types";
import { beforeEach, describe, expect, it } from "vitest";
import { getParentForm, removeProcaptchaResponse } from "../elements/form.js";

describe("elements/form", () => {
	describe("getParentForm", () => {
		beforeEach(() => {
			document.body.innerHTML = "";
		});

		it("should find parent form for regular DOM element", () => {
			const form = document.createElement("form");
			const div = document.createElement("div");
			const widget = document.createElement("div");

			form.appendChild(div);
			div.appendChild(widget);
			document.body.appendChild(form);

			const result = getParentForm(widget);
			expect(result).toBe(form);
		});

		it("should return null if no parent form exists", () => {
			const widget = document.createElement("div");
			document.body.appendChild(widget);

			const result = getParentForm(widget);
			expect(result).toBeNull();
		});

		it("should find parent form for element in shadow DOM", () => {
			const form = document.createElement("form");
			const host = document.createElement("div");
			const shadowRoot = host.attachShadow({ mode: "open" });
			const widget = document.createElement("div");

			shadowRoot.appendChild(widget);
			form.appendChild(host);
			document.body.appendChild(form);

			const result = getParentForm(widget);
			expect(result).toBe(form);
		});

		it("should handle nested forms and return closest one", () => {
			const outerForm = document.createElement("form");
			outerForm.id = "outer";
			const innerForm = document.createElement("form");
			innerForm.id = "inner";
			const widget = document.createElement("div");

			innerForm.appendChild(widget);
			outerForm.appendChild(innerForm);
			document.body.appendChild(outerForm);

			const result = getParentForm(widget);
			expect(result).toBe(innerForm);
		});
	});

	describe("removeProcaptchaResponse", () => {
		beforeEach(() => {
			document.body.innerHTML = "";
		});

		it("should remove all procaptcha response elements", () => {
			const input1 = document.createElement("input");
			input1.name = ApiParams.procaptchaResponse;
			input1.value = "token1";

			const input2 = document.createElement("input");
			input2.name = ApiParams.procaptchaResponse;
			input2.value = "token2";

			document.body.appendChild(input1);
			document.body.appendChild(input2);

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(2);

			removeProcaptchaResponse();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});

		it("should not remove other input elements", () => {
			const procaptchaInput = document.createElement("input");
			procaptchaInput.name = ApiParams.procaptchaResponse;

			const otherInput = document.createElement("input");
			otherInput.name = "other-field";

			document.body.appendChild(procaptchaInput);
			document.body.appendChild(otherInput);

			removeProcaptchaResponse();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
			expect(document.getElementsByName("other-field").length).toBe(1);
		});

		it("should handle case when no procaptcha response elements exist", () => {
			expect(() => removeProcaptchaResponse()).not.toThrow();
			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});

		it("should remove elements from different parts of the DOM", () => {
			const form1 = document.createElement("form");
			const input1 = document.createElement("input");
			input1.name = ApiParams.procaptchaResponse;
			form1.appendChild(input1);

			const form2 = document.createElement("form");
			const input2 = document.createElement("input");
			input2.name = ApiParams.procaptchaResponse;
			form2.appendChild(input2);

			document.body.appendChild(form1);
			document.body.appendChild(form2);

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(2);

			removeProcaptchaResponse();

			expect(
				document.getElementsByName(ApiParams.procaptchaResponse).length,
			).toBe(0);
		});
	});
});
