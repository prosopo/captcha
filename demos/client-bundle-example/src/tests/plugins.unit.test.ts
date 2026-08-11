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

// The demo playground's vite plugins rewrite each demo page's HTML at serve and
// build time. They run over hand-written HTML, so the important behaviour is
// what they do with malformed or already-transformed input: they must return
// the html untouched rather than producing a broken page.

import type { IndexHtmlTransformContext, Plugin } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import explanationInjector from "../plugins/explanation-injector.js";
import formFillerInjector from "../plugins/form-filler-injector.js";
import navigationInjector from "../plugins/navigation-injector.js";
import statusLogInjector from "../plugins/status-log-injector.js";

type Handler = (html: string, ctx: IndexHtmlTransformContext) => string;

// transformIndexHtml is declared in its object form ({ order, handler }) by
// every plugin here; pull the handler out so the tests can call it directly.
const getHandler = (plugin: Plugin): Handler => {
	const transform = plugin.transformIndexHtml;
	if (
		!transform ||
		"function" === typeof transform ||
		!("handler" in transform) ||
		!transform.handler
	) {
		throw new Error(`${plugin.name} has no object-form transformIndexHtml`);
	}
	return transform.handler as unknown as Handler;
};

const ctx = (filename: string): IndexHtmlTransformContext =>
	({ filename, path: `/${filename}` }) as IndexHtmlTransformContext;

const page = (body = "<p>hello</p>"): string =>
	`<html><head><title>demo</title></head><body>${body}</body></html>`;

describe("formFillerInjector", () => {
	const handler = getHandler(formFillerInjector());

	it("is registered as a post transform", () => {
		const transform = formFillerInjector().transformIndexHtml;

		expect(transform).toMatchObject({ order: "post" });
	});

	it("injects the button, its style and its script", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html).toContain('id="form-filler-button"');
		expect(html).toContain(".form-filler-button");
		expect(html).toContain("fillFormWithDefaults");
	});

	it("keeps the injected markup inside the body", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html.indexOf('id="form-filler-button"')).toBeLessThan(
			html.indexOf("</body>"),
		);
	});

	it("leaves html without a body untouched", () => {
		const fragment = "<div>no body here</div>";

		expect(handler(fragment, ctx("src/index.html"))).toBe(fragment);
	});

	it("leaves html with an opening but no closing body untouched", () => {
		const fragment = "<html><body><div>truncated</div>";

		expect(handler(fragment, ctx("src/index.html"))).toBe(fragment);
	});
});

describe("statusLogInjector", () => {
	const handler = getHandler(statusLogInjector());

	it("injects the status log container, css and js", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html).toContain('id="captcha-status"');
		expect(html).toContain("updateCaptchaStatus");
	});

	it("places the status log directly after a form when one exists", () => {
		const html = handler(
			page("<form><input name='a'/></form>"),
			ctx("src/index.html"),
		);

		expect(html.indexOf('id="captcha-status"')).toBeGreaterThan(
			html.indexOf("</form>"),
		);
	});

	it("falls back to the end of the body when there is no form", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html.indexOf('id="captcha-status"')).toBeLessThan(
			html.indexOf("</body>"),
		);
	});

	it("is idempotent — a page that already has a status log is untouched", () => {
		const once = handler(page(), ctx("src/index.html"));

		expect(handler(once, ctx("src/index.html"))).toBe(once);
	});

	it("leaves html without a body untouched", () => {
		const fragment = "<div>no body here</div>";

		expect(handler(fragment, ctx("src/index.html"))).toBe(fragment);
	});
});

describe("explanationInjector", () => {
	const handler = getHandler(explanationInjector());

	const cases: Array<{ file: string; heading: string }> = [
		{ file: "src/frictionless-explicit.html", heading: "Frictionless CAPTCHA" },
		{ file: "src/image-explicit.html", heading: "Image CAPTCHA" },
		{ file: "src/pow-explicit.html", heading: "Proof of Work" },
		{ file: "src/puzzle-explicit.html", heading: "Puzzle CAPTCHA" },
	];

	for (const { file, heading } of cases) {
		it(`generates an explanation for ${file}`, () => {
			const html = handler(page(), ctx(file));

			expect(html).toContain('<div class="explanation">');
			expect(html).toContain(heading);
		});
	}

	it("labels an invisible page as invisible", () => {
		const html = handler(page(), ctx("src/invisible-image-explicit.html"));

		expect(html).toContain("Invisible");
	});

	it("describes implicit rendering for an implicit page", () => {
		const html = handler(page(), ctx("src/image-implicit.html"));

		expect(html).toContain("Implicit");
	});

	it("returns the html unchanged for a page it cannot classify", () => {
		const html = page();

		expect(handler(html, ctx("src/some-other-page.html"))).toBe(html);
	});

	it("returns the html unchanged when there is no filename at all", () => {
		const html = page();

		expect(handler(html, {} as IndexHtmlTransformContext)).toBe(html);
	});

	it("replaces an existing explanation rather than appending a second one", () => {
		const withExplanation = page(
			'<div class="explanation"><div>stale copy</div></div>',
		);

		const html = handler(withExplanation, ctx("src/image-explicit.html"));

		expect(html).not.toContain("stale copy");
		expect(html.match(/<div class="explanation">/g)).toHaveLength(1);
	});

	it("leaves html without a body untouched", () => {
		const fragment = "<div>no body here</div>";

		expect(handler(fragment, ctx("src/image-explicit.html"))).toBe(fragment);
	});
});

describe("navigationInjector", () => {
	const handler = getHandler(navigationInjector());

	beforeEach(() => {
		// the plugin logs the file it is processing on every transform
		vi.spyOn(console, "log").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("is registered as a pre transform", () => {
		expect(navigationInjector().transformIndexHtml).toMatchObject({
			order: "pre",
		});
	});

	it("injects the nav bar with both standard and invisible sections", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html).toContain('id="nav-topbar"');
		expect(html).toContain("Standard Captchas");
		expect(html).toContain("Invisible Captchas");
	});

	it("marks the current page as active", () => {
		const cwd = process.cwd();
		const html = handler(page(), ctx(`${cwd}/src/image-explicit.html`));

		expect(html).toContain('<a href="image-explicit.html" class="active">');
	});

	it("does not mark any link active for a page outside the nav", () => {
		const cwd = process.cwd();
		const html = handler(page(), ctx(`${cwd}/src/unknown.html`));

		expect(html).not.toContain('class="active"');
	});

	it("resolves links relative to a nested page", () => {
		const cwd = process.cwd();
		const html = handler(page(), ctx(`${cwd}/src/nested/deep.html`));

		expect(html).toContain('href="../index.html"');
	});

	it("handles a dist build path as well as a src path", () => {
		const cwd = process.cwd();
		const html = handler(page(), ctx(`${cwd}/dist/pow-explicit.html`));

		expect(html).toContain('<a href="pow-explicit.html" class="active">');
	});

	it("returns the html unchanged when there is no body tag", () => {
		const fragment = "<div>no body here</div>";

		expect(handler(fragment, ctx("src/index.html"))).toBe(fragment);
	});

	it("tolerates a context with no filename", () => {
		const html = handler(page(), {} as IndexHtmlTransformContext);

		expect(html).toContain('id="nav-topbar"');
	});
});
