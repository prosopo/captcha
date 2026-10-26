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

// Shows the code a site would add to get the setup on the current demo page.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import {
	type DemoPage,
	findPageByPath,
	pagePathFromFilename,
} from "./pages.js";
import { fillSlot } from "./slots.js";

const BUNDLE_URL = "https://js.prosopo.io/js/procaptcha.bundle.js";

const implicitSnippet = `<script src="${BUNDLE_URL}" async defer></script>

<form action="/signup" method="POST">
  <!-- your fields -->
  <div class="procaptcha" data-sitekey="YOUR_SITE_KEY"></div>
  <button type="submit">Submit</button>
</form>`;

const explicitSnippet = `<div id="procaptcha-container"></div>

<script type="module">
  import { render } from "${BUNDLE_URL}";

  render(document.getElementById("procaptcha-container"), {
    siteKey: "YOUR_SITE_KEY",
    callback: (token) => {
      // send the token to your server with the form
    },
  });
</script>`;

const manualSnippet = `<script src="${BUNDLE_URL}" async defer></script>

<div class="procaptcha" data-sitekey="YOUR_SITE_KEY"
  data-start-mode="manual"></div>

<script>
  // nothing runs until this is called or the box is ticked
  window.procaptcha.start();
</script>`;

const boundSnippet = `<div id="procaptcha-container"></div>
<button id="submit-button" type="submit">Submit</button>

<script type="module">
  import { render } from "${BUNDLE_URL}";

  render(document.getElementById("procaptcha-container"), {
    siteKey: "YOUR_SITE_KEY",
    bind: "#submit-button",
    callback: (token) => {
      // send the token to your server with the form
    },
  });
</script>`;

const invisibleImplicitSnippet = `<script src="${BUNDLE_URL}" async defer></script>

<button class="procaptcha" data-sitekey="YOUR_SITE_KEY"
  data-size="invisible" data-callback="onSubmit">Submit</button>

<script>
  function onSubmit(token) {
    // send the token to your server with the form
  }
</script>`;

const invisibleExplicitSnippet = `<div id="procaptcha-container"></div>

<script type="module">
  import { render, execute } from "${BUNDLE_URL}";

  render(document.getElementById("procaptcha-container"), {
    siteKey: "YOUR_SITE_KEY",
    size: "invisible",
    callback: (token) => {
      // send the token to your server with the form
    },
  });

  document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    execute();
  });
</script>`;

export const snippetFor = (page: DemoPage): string => {
	if (page.mode === "invisible") {
		return page.rendering === "explicit"
			? invisibleExplicitSnippet
			: invisibleImplicitSnippet;
	}
	switch (page.rendering) {
		case "explicit":
			return explicitSnippet;
		case "manual":
			return manualSnippet;
		case "bound":
			return boundSnippet;
		default:
			return implicitSnippet;
	}
};

const escapeHtml = (text: string): string =>
	text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const copyScript = `
<script>
	document.addEventListener("click", function (event) {
		var button = event.target.closest && event.target.closest("[data-demo-copy]");
		if (!button) return;
		var code = button.closest(".demo-code-block").querySelector("code");
		navigator.clipboard.writeText(code.textContent).then(function () {
			button.textContent = "Copied";
			setTimeout(function () {
				button.textContent = "Copy";
			}, 1500);
		});
	});
</script>`;

// A plain button, not type="button": several specs probe
// button[type='button']:nth-of-type(2) and must not find this one.
const snippetMarkup = (page: DemoPage): string => `
<div class="demo-code-block">
	<div class="demo-code-bar"><button class="demo-copy" data-demo-copy>Copy</button></div>
	<pre class="demo-code"><code>${escapeHtml(snippetFor(page))}</code></pre>
</div>
<p class="demo-note">Pick the captcha type for your site key in the <a href="https://portal.prosopo.io/">portal</a>.</p>
${copyScript}`;

export default function codeSnippetInjector(): Plugin {
	return {
		name: "code-snippet-injector",
		transformIndexHtml: {
			order: "post",
			handler(html: string, ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}
				if (html.includes("data-demo-copy")) {
					return html;
				}

				const page = findPageByPath(pagePathFromFilename(ctx.filename));
				if (!page) {
					return html;
				}

				const markup = snippetMarkup(page);
				return (
					fillSlot(html, "code", markup) ??
					html.replace("</body>", () => `${markup}</body>`)
				);
			},
		},
	};
}
