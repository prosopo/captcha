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

import { afterEach, describe, expect, it } from "vitest";
import { renderProcaptcha } from "../index.js";

afterEach(() => {
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	window.procaptcha = undefined;
});

describe("renderProcaptcha", () => {
	it("is exported as a renderer function", () => {
		expect(typeof renderProcaptcha).toBe("function");
	});

	it("does not touch the DOM until it is called", () => {
		// The renderer is built at import time, but the script must only be
		// fetched on first render — importing the package must cost nothing.
		expect(document.head.querySelectorAll("script")).toHaveLength(0);
	});

	it("injects the build-time script url on first render", async () => {
		const rendering = renderProcaptcha(document.createElement("div"), {
			siteKey: "site-key",
		});
		await Promise.resolve();

		const script = document.head.querySelector("script");
		expect(script).not.toBeNull();

		script?.dispatchEvent(new Event("error"));
		await expect(rendering).rejects.toThrow("Failed to load script");
	});
});
