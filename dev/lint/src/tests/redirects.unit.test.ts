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
import { describe, expect, test } from "vitest";
import {
	buildReplacementText,
	extractMarkdownUrl,
	isInternalLink,
	needsTrailingSlash,
} from "../redirects.js";

describe("isInternalLink", () => {
	test("empty / fragment / mailto are not internal", () => {
		expect(isInternalLink("")).toBe(false);
		expect(isInternalLink("#section")).toBe(false);
		expect(isInternalLink("mailto:hello@prosopo.io")).toBe(false);
	});

	test("protocol-relative or root-relative URLs are internal", () => {
		expect(isInternalLink("/products/foo/")).toBe(true);
		expect(isInternalLink("products/foo/")).toBe(true);
	});

	test("https://prosopo.io and subdomains are internal", () => {
		expect(isInternalLink("https://prosopo.io/products/foo/")).toBe(true);
		expect(isInternalLink("https://docs.prosopo.io/")).toBe(true);
		expect(isInternalLink("http://prosopo.io/")).toBe(true);
	});

	test("third-party hosts that contain 'prosopo.io' in the path are external", () => {
		// Regression: previously matched via substring and got flagged as internal.
		expect(isInternalLink("https://uk.trustpilot.com/review/prosopo.io")).toBe(
			false,
		);
		expect(isInternalLink("https://github.com/prosopo/captcha")).toBe(false);
	});

	test("malformed URLs with a protocol return false rather than throwing", () => {
		expect(isInternalLink("https://")).toBe(false);
	});
});

describe("needsTrailingSlash", () => {
	test("URL already ending with a slash does not need one", () => {
		expect(needsTrailingSlash("/products/foo/")).toBe(false);
		expect(needsTrailingSlash("https://prosopo.io/")).toBe(false);
	});

	test("URLs with fragments or query strings are skipped", () => {
		expect(needsTrailingSlash("/products/foo#features")).toBe(false);
		expect(needsTrailingSlash("/products/foo?utm=x")).toBe(false);
	});

	test("URLs ending in a Nunjucks template expression are skipped", () => {
		// Slash status is unknowable at lint time.
		expect(needsTrailingSlash("{{ site.url }}")).toBe(false);
		expect(needsTrailingSlash("/products/{{ slug }}")).toBe(false);
		// trailing whitespace doesn't defeat the check
		expect(needsTrailingSlash("{{ site.url }}  ")).toBe(false);
	});

	test("URLs with file extensions are skipped", () => {
		expect(needsTrailingSlash("/sitemap.xml")).toBe(false);
		expect(needsTrailingSlash("/api/faqs.json")).toBe(false);
		expect(needsTrailingSlash("/llms-full.txt")).toBe(false);
		expect(needsTrailingSlash("/static/foo.webp")).toBe(false);
	});

	test("plain path missing a trailing slash needs one", () => {
		expect(needsTrailingSlash("/products/foo")).toBe(true);
		expect(needsTrailingSlash("https://prosopo.io/products/foo")).toBe(true);
	});

	test("URL with a templated middle but a static, slashless suffix needs a slash", () => {
		// New behaviour: appending a slash to the static suffix is always safe.
		expect(needsTrailingSlash("{{ site.url }}/products/foo")).toBe(true);
		expect(needsTrailingSlash("/products/{{ slug }}/details")).toBe(true);
	});
});

describe("extractMarkdownUrl", () => {
	test("returns the input unchanged when there is no whitespace", () => {
		expect(extractMarkdownUrl("/products/foo/")).toBe("/products/foo/");
		expect(extractMarkdownUrl("https://prosopo.io/products/foo/")).toBe(
			"https://prosopo.io/products/foo/",
		);
	});

	test("strips an optional markdown title separated by whitespace", () => {
		expect(extractMarkdownUrl('/products/foo/ "title"')).toBe("/products/foo/");
		expect(extractMarkdownUrl("/products/foo/ 'title'")).toBe("/products/foo/");
	});

	test("preserves Nunjucks expressions that contain spaces", () => {
		// Regression: previously split on first space and returned "{{".
		expect(extractMarkdownUrl("{{ site.url }}/products/foo/")).toBe(
			"{{ site.url }}/products/foo/",
		);
	});

	test("handles a templated URL followed by a markdown title", () => {
		expect(extractMarkdownUrl('{{ site.url }}/products/foo/ "title"')).toBe(
			"{{ site.url }}/products/foo/",
		);
	});

	test("handles a URL with multiple template expressions", () => {
		expect(extractMarkdownUrl("/{{ locale }}/products/{{ slug }}/")).toBe(
			"/{{ locale }}/products/{{ slug }}/",
		);
	});

	test("returns the bare template when the URL is purely templated", () => {
		expect(extractMarkdownUrl("{{ site.url }}")).toBe("{{ site.url }}");
	});
});

describe("buildReplacementText", () => {
	test("appends a slash inside markdown parentheses", () => {
		expect(buildReplacementText("[Foo](/products/foo)", "/products/foo")).toBe(
			"[Foo](/products/foo/)",
		);
	});

	test("appends a slash before a markdown title", () => {
		expect(
			buildReplacementText(
				'[Foo](/products/foo "Foo product")',
				"/products/foo",
			),
		).toBe('[Foo](/products/foo/ "Foo product")');
	});

	test("appends a slash inside an HTML double-quoted href", () => {
		expect(
			buildReplacementText('<a href="/products/foo">Foo</a>', "/products/foo"),
		).toBe('<a href="/products/foo/">Foo</a>');
	});

	test("appends a slash inside an HTML single-quoted href", () => {
		expect(
			buildReplacementText("<a href='/products/foo'>Foo</a>", "/products/foo"),
		).toBe("<a href='/products/foo/'>Foo</a>");
	});

	test("appends a slash on a templated markdown URL", () => {
		// End-to-end of the fix this PR added.
		expect(
			buildReplacementText(
				"[Foo]({{ site.url }}/products/foo)",
				"{{ site.url }}/products/foo",
			),
		).toBe("[Foo]({{ site.url }}/products/foo/)");
	});

	test("appends a slash on a templated URL followed by a markdown title", () => {
		expect(
			buildReplacementText(
				'[Foo]({{ site.url }}/products/foo "Foo")',
				"{{ site.url }}/products/foo",
			),
		).toBe('[Foo]({{ site.url }}/products/foo/ "Foo")');
	});

	test("appends a slash on a templated URL inside an HTML href", () => {
		expect(
			buildReplacementText(
				'<a href="{{ site.url }}/products/foo">Foo</a>',
				"{{ site.url }}/products/foo",
			),
		).toBe('<a href="{{ site.url }}/products/foo/">Foo</a>');
	});

	test("returns original text unchanged when the URL is not in a recognised wrapper", () => {
		// e.g. URL in a plain code block or referenced bare somewhere
		expect(
			buildReplacementText("see /products/foo for details", "/products/foo"),
		).toBe("see /products/foo for details");
	});
});
