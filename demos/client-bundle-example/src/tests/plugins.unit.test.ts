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

import { CaptchaType } from "@prosopo/types";
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { describe, expect, it } from "vitest";
import codeSnippetInjector, {
	snippetFor,
} from "../plugins/code-snippet-injector.js";
import formFillerInjector from "../plugins/form-filler-injector.js";
import layoutInjector, { DEMO_HOSTNAME } from "../plugins/layout-injector.js";
import {
	type DemoRendering,
	demoPages,
	findPageByPath,
	pagePathFromFilename,
	relativePrefix,
	renderingsFor,
	resolvePage,
} from "../plugins/pages.js";
import placementInjector from "../plugins/placement-injector.js";
import { fillSlot, slotMarkup } from "../plugins/slots.js";
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

const noBody = "<div>no body here</div>";

const cwd = process.cwd();

describe("pages", () => {
	it("has one page per setup and one setup per page", () => {
		const setups = demoPages.map(
			({ captchaType, mode, rendering }) =>
				`${captchaType}/${mode}/${rendering}`,
		);
		const paths = demoPages.map(({ path }) => path);

		expect(new Set(setups).size).toBe(demoPages.length);
		expect(new Set(paths).size).toBe(demoPages.length);
	});

	it("makes standard implicit frictionless the index page", () => {
		expect(findPageByPath("index.html")).toMatchObject({
			captchaType: CaptchaType.frictionless,
			mode: "standard",
			rendering: "implicit",
		});
	});

	it("falls back to implicit rendering when a setup has no page", () => {
		const resolved = resolvePage({
			captchaType: CaptchaType.frictionless,
			mode: "invisible",
			rendering: "manual",
		});

		expect(resolved.path).toBe("invisible-frictionless-implicit.html");
	});

	it("only offers renderings that have a page", () => {
		const values = (captchaType: CaptchaType.pow | CaptchaType.puzzle) =>
			renderingsFor(captchaType, "standard").map(
				({ value }): DemoRendering => value,
			);

		expect(values(CaptchaType.pow)).toEqual(["implicit", "explicit"]);
		expect(values(CaptchaType.puzzle)).toEqual([
			"implicit",
			"explicit",
			"bound",
		]);
	});

	it("reads the page path from a src, dist or absolute filename", () => {
		expect(pagePathFromFilename("src/index.html")).toBe("index.html");
		expect(pagePathFromFilename(`${cwd}/dist/pow-explicit.html`)).toBe(
			"pow-explicit.html",
		);
		expect(pagePathFromFilename(`${cwd}/src/nested/deep.html`)).toBe(
			"nested/deep.html",
		);
		expect(pagePathFromFilename(undefined)).toBe("");
	});

	it("climbs out of nested pages", () => {
		expect(relativePrefix("index.html")).toBe("");
		expect(relativePrefix("nested/deep.html")).toBe("../");
	});
});

describe("slots", () => {
	it("returns undefined when the slot is not on the page", () => {
		expect(fillSlot(page(), "events", "x")).toBeUndefined();
	});

	it("inserts content literally, even when it looks like a replace pattern", () => {
		const html = fillSlot(page(slotMarkup("events")), "events", "$&");

		expect(html).toBe(page("$&"));
	});
});

describe("layoutInjector", () => {
	const handler = getHandler(layoutInjector());

	it("is registered as a pre transform", () => {
		expect(layoutInjector().transformIndexHtml).toMatchObject({
			order: "pre",
		});
	});

	it("wraps the page in the header, sidebar and panel with a slot for each plugin", () => {
		const html = handler(page(), ctx(`${cwd}/src/pow-explicit.html`));

		expect(html).toContain('<body class="demo">');
		expect(html).toContain('class="demo-header"');
		expect(html).toContain('href="styles/demo.css"');
		for (const slot of ["placement", "toolbar", "events", "code"] as const) {
			expect(html).toContain(slotMarkup(slot));
		}
		expect(html.indexOf("<p>hello</p>")).toBeLessThan(
			html.indexOf('class="demo-panel"'),
		);
	});

	it("loads Plausible only when served from the public demo host", () => {
		const html = handler(page(), ctx(`${cwd}/src/pow-explicit.html`));
		const inlineScript = html.match(
			/<script>\s*\(function \(\) \{([\s\S]*?)\}\)\(\);\s*<\/script>/,
		)?.[1];
		expect(inlineScript).toBeDefined();

		type FakeElement = Record<string, unknown>;
		const loadedFrom = (hostname: string): FakeElement[] => {
			const appended: FakeElement[] = [];
			const fakeDocument = {
				createElement: (): FakeElement => {
					const element: FakeElement = {};
					element.setAttribute = (name: string, value: string): void => {
						element[name] = value;
					};
					return element;
				},
				head: {
					appendChild: (element: FakeElement): void => {
						appended.push(element);
					},
				},
			};
			new Function("location", "document", inlineScript ?? "")(
				{ hostname },
				fakeDocument,
			);
			return appended;
		};

		expect(loadedFrom("localhost")).toHaveLength(0);
		expect(loadedFrom(`staging.${DEMO_HOSTNAME}`)).toHaveLength(0);
		const [tracker] = loadedFrom(DEMO_HOSTNAME);
		expect(tracker).toMatchObject({
			defer: true,
			"data-domain": DEMO_HOSTNAME,
			src: "https://prosopo.io/js/script.kairee5buy1chae8eit0so8ahphae9Oo.js",
		});
	});

	it("marks the current type, mode and rendering", () => {
		const html = handler(page(), ctx(`${cwd}/src/pow-explicit.html`));

		expect(html.match(/aria-current="page"/g)).toHaveLength(3);
		expect(html).toContain(
			'<a class="demo-choice" data-demo-nav href="pow-explicit.html" aria-current="page">',
		);
	});

	it("folds rendering away unless the page uses a non-default rendering", () => {
		const implicit = handler(page(), ctx(`${cwd}/src/pow-implicit.html`));
		const explicit = handler(page(), ctx(`${cwd}/src/pow-explicit.html`));

		expect(implicit).toContain('<details class="demo-advanced">');
		expect(explicit).toContain('<details class="demo-advanced" open>');
	});

	it("keeps the mode and rendering when switching captcha type", () => {
		const html = handler(
			page(),
			ctx(`${cwd}/src/invisible-image-explicit.html`),
		);

		expect(html).toContain('href="invisible-pow-explicit.html"');
		expect(html).toContain('href="invisible-puzzle-explicit.html"');
	});

	it("marks nothing current and shows no code for a page outside the registry", () => {
		const html = handler(page(), ctx(`${cwd}/src/pow-implicit-sessionid.html`));

		expect(html).not.toContain('aria-current="page"');
		expect(html).not.toContain(slotMarkup("code"));
		expect(html).toContain('href="index.html"');
	});

	it("resolves links relative to a nested page", () => {
		const html = handler(page(), ctx(`${cwd}/src/nested/deep.html`));

		expect(html).toContain('href="../index.html"');
		expect(html).toContain('href="../styles/demo.css"');
	});

	it("tolerates a context with no filename", () => {
		const html = handler(page(), {} as IndexHtmlTransformContext);

		expect(html).toContain('class="demo-header"');
	});

	it("returns the html unchanged when there is no body tag", () => {
		expect(handler(noBody, ctx("src/index.html"))).toBe(noBody);
	});
});

describe("codeSnippetInjector", () => {
	const handler = getHandler(codeSnippetInjector());

	it("fills the code slot with the escaped snippet for the page", () => {
		const html = handler(
			page(slotMarkup("code")),
			ctx(`${cwd}/src/frictionless-explicit.html`),
		);

		expect(html).not.toContain(slotMarkup("code"));
		expect(html).toContain("data-demo-copy");
		expect(html).toContain("&lt;div id=&quot;procaptcha-container&quot;&gt;");
	});

	it("falls back to the end of the body when there is no slot", () => {
		const html = handler(page(), ctx(`${cwd}/src/index.html`));

		expect(html.indexOf("data-demo-copy")).toBeLessThan(
			html.indexOf("</body>"),
		);
	});

	it("gives every demo page a snippet that uses a placeholder site key", () => {
		for (const demoPage of demoPages) {
			expect(snippetFor(demoPage)).toContain("YOUR_SITE_KEY");
		}
	});

	it("matches the snippet to the rendering and mode", () => {
		const snippet = (path: string): string => {
			const demoPage = findPageByPath(path);
			if (!demoPage) {
				throw new Error(`${path} is not a demo page`);
			}
			return snippetFor(demoPage);
		};

		expect(snippet("pow-implicit.html")).toContain('class="procaptcha"');
		expect(snippet("frictionless-manual-start.html")).toContain(
			'data-start-mode="manual"',
		);
		expect(snippet("puzzle-bind-explicit.html")).toContain("bind:");
		expect(snippet("invisible-image-implicit.html")).toContain(
			'data-size="invisible"',
		);
		expect(snippet("invisible-image-explicit.html")).toContain("execute()");
	});

	it("returns the html unchanged for a page outside the registry", () => {
		const html = page();

		expect(handler(html, ctx(`${cwd}/src/some-other-page.html`))).toBe(html);
		expect(handler(html, {} as IndexHtmlTransformContext)).toBe(html);
	});

	it("is idempotent", () => {
		const once = handler(page(), ctx(`${cwd}/src/index.html`));

		expect(handler(once, ctx(`${cwd}/src/index.html`))).toBe(once);
	});

	it("leaves html without a body untouched", () => {
		expect(handler(noBody, ctx(`${cwd}/src/index.html`))).toBe(noBody);
	});
});

describe("statusLogInjector", () => {
	const handler = getHandler(statusLogInjector());

	it("injects the status log container and js", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html).toContain('id="captcha-status"');
		expect(html).toContain("updateCaptchaStatus");
	});

	it("defines updateCaptchaStatus before the page's entry module runs", () => {
		// What Vite hands a "post" transform: the entry module already hoisted
		// into <head>. Module scripts run in document order, so the helper must
		// be defined by a classic script ahead of it.
		const built =
			'<html><head><title>demo</title><script type="module" crossorigin src="/assets/entry.js"></script></head><body><p>hi</p></body></html>';
		const html = handler(built, ctx("src/frictionless-explicit.html"));

		const definedAt = html.indexOf("window.updateCaptchaStatus = ");
		const entryAt = html.indexOf('src="/assets/entry.js"');
		expect(definedAt).toBeGreaterThan(-1);
		expect(definedAt).toBeLessThan(entryAt);
		const definingScript = html.lastIndexOf("<script", definedAt);
		expect(html.slice(definingScript, definedAt)).not.toContain("module");
	});

	it("wraps the page callbacks after the page's entry module", () => {
		const built =
			'<html><head><script type="module" src="/assets/entry.js"></script></head><body></body></html>';
		const html = handler(built, ctx("src/image-explicit.html"));

		expect(html.indexOf("window.onCaptchaFailed = ")).toBeGreaterThan(
			html.indexOf('src="/assets/entry.js"'),
		);
	});

	it("fills the events slot when the layout provides one", () => {
		const html = handler(
			page(`<form></form>${slotMarkup("events")}`),
			ctx("src/index.html"),
		);

		expect(html).not.toContain(slotMarkup("events"));
		expect(html.indexOf('id="captcha-status"')).toBeGreaterThan(
			html.indexOf("</form>"),
		);
	});

	it("places the status log directly after a form when there is no slot", () => {
		const html = handler(
			page("<form><input name='a'/></form><p>after</p>"),
			ctx("src/index.html"),
		);

		expect(html.indexOf('id="captcha-status"')).toBeGreaterThan(
			html.indexOf("</form>"),
		);
		expect(html.indexOf('id="captcha-status"')).toBeLessThan(
			html.indexOf("<p>after</p>"),
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
		expect(handler(noBody, ctx("src/index.html"))).toBe(noBody);
	});
});

describe("placementInjector", () => {
	const handler = getHandler(placementInjector());

	it("fills the placement slot with both options and the script", () => {
		const html = handler(page(slotMarkup("placement")), ctx("src/index.html"));

		expect(html).not.toContain(slotMarkup("placement"));
		expect(html).toContain('data-placement-option="popup"');
		expect(html).toContain('data-placement-option="float"');
		expect(html).toContain("data-placement");
	});

	it("uses links rather than buttons for the options", () => {
		const html = handler(page(slotMarkup("placement")), ctx("src/index.html"));

		expect(html).not.toMatch(/<button[^>]*data-placement-option/);
	});

	it("goes above the status log when there is no slot", () => {
		const html = handler(
			page('<div id="captcha-status" class="captcha-status"></div>'),
			ctx("src/index.html"),
		);

		expect(html.indexOf('id="placement-switcher"')).toBeLessThan(
			html.indexOf('id="captcha-status"'),
		);
	});

	it("is idempotent", () => {
		const once = handler(page(), ctx("src/index.html"));

		expect(handler(once, ctx("src/index.html"))).toBe(once);
	});

	it("leaves html without a body untouched", () => {
		expect(handler(noBody, ctx("src/index.html"))).toBe(noBody);
	});
});

describe("formFillerInjector", () => {
	const handler = getHandler(formFillerInjector());

	it("is registered as a post transform", () => {
		expect(formFillerInjector().transformIndexHtml).toMatchObject({
			order: "post",
		});
	});

	it("injects the button and its script", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html).toContain('id="form-filler-button"');
		expect(html).toContain("fillFormWithDefaults");
	});

	it("puts the button in the toolbar slot when the layout provides one", () => {
		const html = handler(
			page(`<div class="demo-toolbar">${slotMarkup("toolbar")}</div>`),
			ctx("src/index.html"),
		);

		expect(html).not.toContain(slotMarkup("toolbar"));
		expect(html).toMatch(
			/<div class="demo-toolbar">\s*<button id="form-filler-button"/,
		);
	});

	it("keeps the injected markup inside the body", () => {
		const html = handler(page(), ctx("src/index.html"));

		expect(html.indexOf('id="form-filler-button"')).toBeLessThan(
			html.indexOf("</body>"),
		);
	});

	it("leaves html without a body untouched", () => {
		expect(handler(noBody, ctx("src/index.html"))).toBe(noBody);
	});

	it("leaves html with an opening but no closing body untouched", () => {
		const fragment = "<html><body><div>truncated</div>";

		expect(handler(fragment, ctx("src/index.html"))).toBe(fragment);
	});
});
