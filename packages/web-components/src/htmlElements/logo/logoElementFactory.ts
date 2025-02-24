// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import { WIDGET_URL, WIDGET_URL_TEXT } from "../../constants.js";
import type { Theme } from "../../theme.js";
import type { HtmlElementFactory } from "../htmlElementFactory.js";

class LogoElementFactory implements HtmlElementFactory {
	public constructor(private readonly svgLogoIconFactory: HtmlElementFactory) {}

	public createHtmlElement(theme: Theme): HTMLElement {
		const widgetLogo = document.createElement("div");
		widgetLogo.className = "logo";

		const svgLogo = this.svgLogoIconFactory.createHtmlElement(theme);

		widgetLogo.innerHTML = this.getStyles() + this.getMarkup();
		widgetLogo.querySelector(".logo__svg")?.replaceWith(svgLogo);

		return widgetLogo;
	}

	protected getMarkup(): string {
		return `
<a href={WIDGET_URL} target="_blank" aria-label={WIDGET_URL_TEXT}>
	<div class="logo__outer">
		<div class="logo__wrapper">
			<div class="logo__inner">
				<div class="logo__svg"></div>
			</div>
		</div>
	</div>
</a>
    `;
	}

	protected getStyles(): string {
		return `
<style>
.logo {
    display: inline-flex;
    flex-direction: column;
}

.logo__outer {
    flex:1;
}

.logo__wrapper {
    padding: 4px;
    flex: 1 1 0;
}

.logo__inner {
    padding: 4px;
}
</style>
`;
	}
}

export { LogoElementFactory };
