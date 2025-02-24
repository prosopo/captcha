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

import type { HtmlElementFactory } from "../htmlElements/htmlElementFactory.js";
import type { Theme } from "../theme.js";
import type { WidgetFactory } from "../widgetFactory.js";
import type { WebComponentFactory } from "./webComponentFactory.js";

class WidgetWebComponentFactory implements WidgetFactory {
	constructor(
		private readonly widgetElementFactory: HtmlElementFactory,
		private readonly webComponentFactory: WebComponentFactory,
	) {}

	public createWidget(theme: Theme, webComponentTag: string): HTMLElement {
		const element = this.widgetElementFactory.createHtmlElement(theme);

		const webComponent =
			this.webComponentFactory.createWebComponent(webComponentTag);

		const componentRoot = webComponent.shadowRoot || webComponent;

		componentRoot.appendChild(element);

		return webComponent;
	}
}

export { WidgetWebComponentFactory };
