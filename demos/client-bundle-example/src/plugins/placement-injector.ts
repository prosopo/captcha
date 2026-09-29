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

// Vite plugin to inject a popup/float placement switcher into HTML files.
//
// Placement is resolved once, when the widget renders, so switching it means
// re-rendering. The switcher therefore drives `?placement=` and reloads rather
// than mutating a live widget. The explicit pages read that query parameter
// themselves and pass `placement` as a render option; implicit pages have no
// script of their own, so the injected script stamps `data-placement` onto
// their containers instead, which exercises the attribute path.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { fillSlot } from "./slots.js";

export default function placementInjector(): Plugin {
	const placementHtml = `
	<div id="placement-switcher" class="demo-group">
		<div class="demo-group__label">Challenge placement</div>
		<nav class="demo-segmented" aria-label="Challenge placement">
			<a data-placement-option="popup" href="?placement=popup">Popup</a>
			<a data-placement-option="float" href="?placement=float">Float</a>
		</nav>
		<p id="placement-note" class="demo-placement-note"></p>
	</div>
  `;

	// Runs before DOMContentLoaded, so the attribute is on the container by the
	// time the bundle's implicit render reads it.
	const placementJs = `
	<script>
		(function () {
			var requested = new URLSearchParams(window.location.search).get("placement");
			var placement = requested === "float" ? "float" : "popup";

			// Buttons are the invisible variant, which resolves float back to
			// popup -- stamped anyway so the downgrade is visible rather than
			// untested.
			var containers = document.getElementsByClassName("procaptcha");
			for (var i = 0; i < containers.length; i++) {
				containers[i].setAttribute("data-placement", placement);
			}

			var invisible = containers.length > 0 &&
				document.querySelectorAll('.procaptcha[data-size="invisible"], button.procaptcha').length > 0;

			var note = document.getElementById("placement-note");
			if (note) {
				note.textContent = placement === "float" && invisible
					? "An invisible widget has nothing to anchor to, so the challenge opens as a popup."
					: placement === "float"
						? "The challenge opens next to the widget and stays pinned while you scroll."
						: "The challenge opens in the middle of the page.";
			}

			// Links rather than buttons, and not only because navigation is what
			// they do: several specs reach for an element with
			// button[type='button']:nth-of-type(2), which a pair of injected
			// buttons answers to, and following one mid-test reloads the page.
			var options = document.querySelectorAll("[data-placement-option]");
			for (var j = 0; j < options.length; j++) {
				var option = options[j];
				var value = option.getAttribute("data-placement-option");
				// Rebuilt from the live URL so the switch keeps any other query
				// parameters the page was opened with.
				var url = new URL(window.location.href);
				url.searchParams.set("placement", value);
				option.setAttribute("href", url.toString());
				if (value === placement) option.setAttribute("aria-current", "page");
			}
		})();
	</script>
  `;

	return {
		name: "placement-injector",
		transformIndexHtml: {
			order: "post",
			handler(html: string, _ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				if (html.includes('id="placement-switcher"')) {
					return html;
				}

				// Without the layout, the switcher goes above the status log so the
				// widget and its controls stay together.
				const withSwitcher =
					fillSlot(html, "placement", placementHtml) ??
					(html.includes('<div id="captcha-status"')
						? html.replace(
								'<div id="captcha-status"',
								() => `${placementHtml}<div id="captcha-status"`,
							)
						: html.replace("</body>", () => `${placementHtml}</body>`));

				// The script goes last so every element it touches has been parsed.
				return withSwitcher.replace("</body>", () => `${placementJs}</body>`);
			},
		},
	};
}
