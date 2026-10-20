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
// Vite plugin to inject a widget language picker into HTML files.
//
// The widget resolves its language once, when it renders, so the picker drives
// `?language=` and reloads. The injected script stamps `data-language` onto the
// implicit containers and the explicit pages' render target; the bundle reads
// that attribute when no `language` render option is passed.
import type { IndexHtmlTransformContext, Plugin } from "vite";
import { fillSlot } from "./slots.js";

export type DemoLanguage = { tag: string; name: string };

export const DEMO_LANGUAGES: readonly DemoLanguage[] = [
	{ tag: "ar", name: "العربية" },
	{ tag: "de", name: "Deutsch" },
	{ tag: "en", name: "English" },
	{ tag: "es", name: "Español" },
	{ tag: "fr", name: "Français" },
	{ tag: "he", name: "עברית" },
	{ tag: "hi", name: "हिन्दी" },
	{ tag: "it", name: "Italiano" },
	{ tag: "ja", name: "日本語" },
	{ tag: "ko", name: "한국어" },
	{ tag: "pl", name: "Polski" },
	{ tag: "pt-BR", name: "Português (Brasil)" },
	{ tag: "ru", name: "Русский" },
	{ tag: "tr", name: "Türkçe" },
	{ tag: "uk", name: "Українська" },
	{ tag: "zh-CN", name: "中文（简体）" },
];

const languageOptions = (): string =>
	DEMO_LANGUAGES.map(
		(language: DemoLanguage) =>
			`<option value="${language.tag}" lang="${language.tag}">${language.name}</option>`,
	).join("");

export const languageHtml = `
	<div id="language-switcher" class="demo-group">
		<label class="demo-group__label" for="language-select">Widget language</label>
		<select id="language-select" class="demo-select">
			<option value="">Browser default</option>${languageOptions()}
		</select>
	</div>
  `;

// Runs before DOMContentLoaded, so the attribute is on the container by the
// time the bundle renders. Any language works via the URL, even ones not in
// the list, so a tag missing from the picker can still be tested.
export const languageJs = `
	<script>
		(function () {
			var language = new URLSearchParams(window.location.search).get("language");

			if (language) {
				var containers = document.querySelectorAll(".procaptcha, #procaptcha-container");
				for (var i = 0; i < containers.length; i++) {
					containers[i].setAttribute("data-language", language);
				}
			}

			var select = document.getElementById("language-select");
			if (!select) return;
			var listed = false;
			for (var j = 0; j < select.options.length; j++) {
				if (select.options[j].value === language) listed = true;
			}
			if (language && !listed) {
				var custom = document.createElement("option");
				custom.value = language;
				custom.textContent = language;
				select.appendChild(custom);
			}
			select.value = language || "";
			select.addEventListener("change", function () {
				var url = new URL(window.location.href);
				if (select.value) url.searchParams.set("language", select.value);
				else url.searchParams.delete("language");
				window.location.assign(url.toString());
			});
		})();
	</script>
  `;

export default function languageInjector(): Plugin {
	return {
		name: "language-injector",
		transformIndexHtml: {
			order: "post",
			handler(html: string, _ctx: IndexHtmlTransformContext): string {
				if (!html.includes("<body") || !html.includes("</body>")) {
					return html;
				}

				if (html.includes('id="language-switcher"')) {
					return html;
				}

				const withSwitcher =
					fillSlot(html, "language", languageHtml) ??
					(html.includes('<div id="captcha-status"')
						? html.replace(
								'<div id="captcha-status"',
								() => `${languageHtml}<div id="captcha-status"`,
							)
						: html.replace("</body>", () => `${languageHtml}</body>`));

				return withSwitcher.replace("</body>", () => `${languageJs}</body>`);
			},
		},
	};
}
