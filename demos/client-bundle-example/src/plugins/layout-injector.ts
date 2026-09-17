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

// Wraps every demo page in the playground shell: the prosopo.io header, a
// sidebar that links between the demo pages, and a panel for the event log,
// the code for the current setup and the sign-up call to action.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { prosopoWordmark } from "./logo.js";
import {
	type DemoPage,
	type DemoSetup,
	captchaTypeOptions,
	defaultSetup,
	findPageByPath,
	labelOf,
	modeOptions,
	pagePathFromFilename,
	relativePrefix,
	renderingOptions,
	renderingsFor,
	resolvePage,
} from "./pages.js";
import { slotMarkup } from "./slots.js";

export const SIGN_UP_URL = "https://prosopo.io/pricing/";
const LOGIN_URL = "https://portal.prosopo.io/";
const DOCS_URL = "https://docs.prosopo.io/";

const ariaCurrent = (isCurrent: boolean): string =>
	isCurrent ? ' aria-current="page"' : "";

const headTags = (prefix: string): string => `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="${prefix}styles/demo.css">`;

const header = `
<header class="demo-header">
	<a class="demo-header__logo" href="https://prosopo.io/">${prosopoWordmark}</a>
	<nav class="demo-header__nav" aria-label="prosopo.io">
		<a href="https://prosopo.io/products/">Platform</a>
		<a href="${SIGN_UP_URL}">Pricing</a>
		<a href="${DOCS_URL}">Docs</a>
		<a href="https://prosopo.io/blog/">Blog</a>
	</nav>
	<div class="demo-header__actions">
		<a class="demo-link-button demo-link-button--muted" href="${LOGIN_URL}">Login</a>
		<a class="demo-link-button demo-link-button--primary" href="${SIGN_UP_URL}">Get started →</a>
	</div>
</header>`;

const sidebar = (page: DemoPage | undefined, prefix: string): string => {
	const setup: DemoSetup = page ?? defaultSetup;
	const href = (target: DemoSetup): string =>
		`${prefix}${resolvePage(target).path}`;

	const choice = (
		target: DemoSetup,
		isCurrent: boolean,
		name: string,
		description: string,
	): string => `
		<a class="demo-choice" data-demo-nav href="${href(target)}"${ariaCurrent(isCurrent)}>
			<span class="demo-choice__radio"></span>
			<span class="demo-choice__body">
				<span class="demo-choice__name">${name}</span>
				<span class="demo-choice__description">${description}</span>
			</span>
		</a>`;

	const types = captchaTypeOptions
		.map(({ value, label, description }) =>
			choice(
				{ ...setup, captchaType: value },
				page?.captchaType === value,
				value === defaultSetup.captchaType
					? `${label}<span class="demo-badge">Default</span>`
					: label,
				description,
			),
		)
		.join("");

	const modes = modeOptions
		.map(
			({ value, label }) =>
				`<a data-demo-nav href="${href({ ...setup, mode: value })}"${ariaCurrent(page?.mode === value)}>${label}</a>`,
		)
		.join("");

	const renderings = renderingsFor(setup.captchaType, setup.mode)
		.map(({ value, label, description }) =>
			choice(
				{ ...setup, rendering: value },
				page?.rendering === value,
				label,
				description,
			),
		)
		.join("");

	// Rendering is an integration detail, so it stays folded away unless the
	// visitor is already on a non-default rendering.
	const advancedOpen =
		page && page.rendering !== defaultSetup.rendering ? " open" : "";

	return `
<aside class="demo-sidebar">
	<div class="demo-intro-block">
		<div class="demo-eyebrow">Live demo</div>
		<h1 class="demo-title">Procaptcha playground</h1>
		<p class="demo-intro">Pick a setup, fill in the form, see what happens.</p>
	</div>
	<nav class="demo-group" aria-label="Captcha type">
		<div class="demo-group__label">Captcha type</div>
		<div class="demo-types">${types}
		</div>
	</nav>
	<div class="demo-group">
		<div class="demo-group__label">Mode</div>
		<nav class="demo-segmented" aria-label="Mode">${modes}</nav>
	</div>
	${slotMarkup("placement")}
	<details class="demo-advanced"${advancedOpen}>
		<summary>Advanced</summary>
		<div class="demo-group">
			<div class="demo-group__label">Rendering</div>
			<p class="demo-group__hint">How the widget gets onto your page. Most sites use implicit.</p>
			<nav class="demo-renderings" aria-label="Rendering">${renderings}
			</nav>
		</div>
	</details>
</aside>`;
};

const chips = (page: DemoPage | undefined): string =>
	page
		? [
				labelOf(captchaTypeOptions, page.captchaType),
				labelOf(modeOptions, page.mode),
				...(page.rendering === defaultSetup.rendering
					? []
					: [labelOf(renderingOptions, page.rendering)]),
			]
				.map((label) => `<span class="demo-chip">${label}</span>`)
				.join("")
		: "";

const layoutOpen = (page: DemoPage | undefined, prefix: string): string => `
<div class="demo-layout">
${sidebar(page, prefix)}
<main class="demo-main">
	<div class="demo-toolbar">${chips(page)}${slotMarkup("toolbar")}</div>
`;

// Pages outside the registry (web3, session id) have no snippet to show.
const codeSection = (page: DemoPage | undefined): string =>
	page
		? `
	<section class="demo-panel__section">
		<h2 class="demo-panel__title">Code for this setup</h2>
		${slotMarkup("code")}
	</section>`
		: "";

const layoutClose = (page: DemoPage | undefined): string => `
	<p class="demo-cta-line">Want this on your site? <a href="${SIGN_UP_URL}">Start free, no credit card →</a></p>
</main>
<aside class="demo-panel" aria-label="What happened">
	<section class="demo-panel__section">
		<h2 class="demo-panel__title">Events</h2>
		${slotMarkup("events")}
	</section>${codeSection(page)}
	<div class="demo-panel__cta">
		<h2>Get your own site key</h2>
		<p>Free plan. No credit card required.</p>
		<a class="demo-link-button demo-link-button--pink" href="${SIGN_UP_URL}">Get started →</a>
	</div>
</aside>
</div>`;

// Placement is a query parameter, so carry it across when moving between pages.
const keepPlacementScript = `
<script>
	(function () {
		var placement = new URLSearchParams(window.location.search).get("placement");
		if (!placement) return;
		var links = document.querySelectorAll("a[data-demo-nav]");
		for (var i = 0; i < links.length; i++) {
			var url = new URL(links[i].getAttribute("href"), window.location.href);
			url.searchParams.set("placement", placement);
			links[i].setAttribute("href", url.toString());
		}
	})();
</script>`;

export default function layoutInjector(): Plugin {
	return {
		name: "layout-injector",
		transformIndexHtml: {
			order: "pre",
			handler(html: string, ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body>") || !html.includes("</body>")) {
					return html;
				}

				const pagePath = pagePathFromFilename(ctx.filename);
				const page = findPageByPath(pagePath);
				const prefix = relativePrefix(pagePath);

				return html
					.replace("<head>", () => `<head>${headTags(prefix)}`)
					.replace(
						"<body>",
						() => `<body class="demo">${header}${layoutOpen(page, prefix)}`,
					)
					.replace(
						"</body>",
						() => `${layoutClose(page)}${keepPlacementScript}\n</body>`,
					);
			},
		},
	};
}
