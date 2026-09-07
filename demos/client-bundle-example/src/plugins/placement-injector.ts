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

export default function placementInjector(): Plugin {
	const placementCss = `
	<style>
		.placement-switcher {
			margin: 20px 0;
			padding: 12px 15px;
			background-color: #f0f8ff;
			border: 2px solid #2196F3;
			border-radius: 5px;
			font-family: monospace;
			font-size: 14px;
		}
		.placement-switcher-title {
			font-weight: bold;
			margin-bottom: 10px;
			border-bottom: 1px solid #2196F3;
			padding-bottom: 5px;
		}
		.placement-option {
			display: inline-block;
			margin-right: 8px;
			padding: 6px 14px;
			border: 1px solid #2196F3;
			border-radius: 4px;
			background-color: white;
			color: #2196F3;
			cursor: pointer;
			font-family: inherit;
			font-size: inherit;
		}
		.placement-option[aria-pressed="true"] {
			background-color: #2196F3;
			color: white;
			font-weight: bold;
		}
		.placement-note {
			margin-top: 10px;
			color: #555;
		}
	</style>
  `;

	const placementHtml = `
	<!-- Challenge placement switcher -->
	<div id="placement-switcher" class="placement-switcher">
		<div class="placement-switcher-title">Challenge placement</div>
		<button type="button" class="placement-option" data-placement-option="popup">popup</button>
		<button type="button" class="placement-option" data-placement-option="float">float</button>
		<div id="placement-note" class="placement-note"></div>
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
					? "float requested, but an invisible widget has nothing to anchor to, so the challenge opens as a popup."
					: placement === "float"
						? "The challenge opens directly above the widget and stays pinned there while you scroll. The page stays usable behind it."
						: "The challenge opens centred over the page. This is the default.";
			}

			var buttons = document.querySelectorAll("[data-placement-option]");
			for (var j = 0; j < buttons.length; j++) {
				(function (button) {
					var value = button.getAttribute("data-placement-option");
					button.setAttribute("aria-pressed", String(value === placement));
					button.addEventListener("click", function () {
						if (value === placement) return;
						var url = new URL(window.location.href);
						url.searchParams.set("placement", value);
						window.location.href = url.toString();
					});
				})(buttons[j]);
			}
		})();
	</script>
  `;

	return {
		name: "placement-injector",
		transformIndexHtml: {
			order: "post", // after the nav bar and status log are in place
			handler(html: string, _ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				if (html.includes('id="placement-switcher"')) {
					return html;
				}

				const withCss = html.replace("</head>", `${placementCss}</head>`);

				// The switcher goes above the status log so the widget and its
				// controls stay together, and the script goes last so every
				// element it touches has been parsed.
				const withSwitcher = withCss.includes('<div id="captcha-status"')
					? withCss.replace(
							'<div id="captcha-status"',
							`${placementHtml}<div id="captcha-status"`,
						)
					: withCss.replace("</body>", `${placementHtml}</body>`);

				return withSwitcher.replace("</body>", `${placementJs}</body>`);
			},
		},
	};
}
