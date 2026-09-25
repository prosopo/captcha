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
import fc from "fast-check";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractParams } from "../../util/config.js";

const value = fc.string({ unit: "grapheme", minLength: 1 });
const fragment = fc.option(fc.stringMatching(/^[a-z0-9]{1,10}$/), {
	nil: undefined,
});

describe("extractParams, arbitrary script urls", () => {
	beforeEach(() => {
		const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "https://example.com",
		});
		global.document = dom.window.document;
	});

	afterEach(() => {
		Object.assign(global, { document: undefined });
	});

	it("reads back the onload and render values the page put in the query", () => {
		fc.assert(
			fc.property(value, value, fragment, (onload, render, hash) => {
				document.body.replaceChildren();
				const script = document.createElement("script");
				const query = new URLSearchParams({ onload, render }).toString();
				script.src = `https://js.prosopo.io/js/procaptcha.bundle.js?${query}${hash === undefined ? "" : `#${hash}`}`;
				document.body.appendChild(script);

				expect(extractParams(["procaptcha.bundle.js"])).toEqual({
					onloadUrlCallback: onload,
					renderExplicit: render,
				});
			}),
		);
	});
});
