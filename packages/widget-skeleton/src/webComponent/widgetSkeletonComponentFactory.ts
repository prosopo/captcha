// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import type { WidgetInteractiveAreaProvider } from "../widgetInteractiveAreaProvider.js";
import type { WidgetSkeletonFactory } from "../widgetSkeletonFactory.js";
import type { WebComponentFactory } from "./webComponentFactory.js";

class WidgetSkeletonComponentFactory implements WidgetSkeletonFactory {
	constructor(
		private readonly widgetSkeletonElementFactory: HtmlElementFactory,
		private readonly webComponentFactory: WebComponentFactory,
		private readonly widgetInteractiveAreaProvider: WidgetInteractiveAreaProvider,
	) {}

	public createWidgetSkeleton(container: Element, theme: Theme): HTMLElement {
		const widgetWebComponent = this.createWidgetWebComponent(theme);

		// Clear all the children inside, if there are any.
		// If the initializeWidget() is called several times on the same element, it should recreate the captcha from scratch.
		container.innerHTML = "";
		container.appendChild(widgetWebComponent);

		return this.getWidgetInteractiveArea(widgetWebComponent);
	}

	protected createWidgetWebComponent(theme: Theme): HTMLElement {
		const widget = this.widgetSkeletonElementFactory.createHtmlElement(theme);
		const webComponent = this.webComponentFactory.createWebComponent();
		const webComponentRoot = webComponent.shadowRoot || webComponent;

		webComponentRoot.appendChild(widget);

		return webComponent;
	}

	protected getWidgetInteractiveArea(widget: HTMLElement): HTMLElement {
		const widgetInteractiveArea =
			this.widgetInteractiveAreaProvider.getWidgetInteractiveArea(widget);

		if (widgetInteractiveArea instanceof HTMLElement) {
			return widgetInteractiveArea;
		}

		const errorMessage =
			"Fail to initialize widget: interactive area is not found";

		console.error(errorMessage, {
			widget: widget,
		});

		throw new Error(errorMessage);
	}
}

export { WidgetSkeletonComponentFactory };
