import {
	CaptchaType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import {
	type WidgetFactory,
	type WidgetInteractiveAreaProvider,
	darkTheme,
	lightTheme,
} from "@prosopo/web-components";
import type { Root } from "react-dom/client";
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";

class WidgetInitializer {
	public constructor(
		private readonly widgetFactory: WidgetFactory,
		private readonly widgetInteractiveAreaProvider: WidgetInteractiveAreaProvider,
		private readonly captchaRenderer: CaptchaRenderer,
	) {}

	public initializeWidget(
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Root {
		const theme = "light" === config.theme ? lightTheme : darkTheme;

		const widget = this.widgetFactory.createWidget(theme);

		// Clear all the children inside, if there are any.
		// If the initializeWidget() is called several times on the same element, it should recreate the captcha from scratch.
		element.innerHTML = "";
		element.appendChild(widget);

		const widgetInteractiveArea = this.getWidgetInteractiveArea(widget);

		const captchaRoot = this.captchaRenderer.renderCaptcha(
			{
				identifierPrefix: "procaptcha-",
				emotionCacheKey: "procaptcha",
				webComponentTag: "prosopo-procaptcha",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			widgetInteractiveArea,
			config,
			renderOptions,
		);

		return captchaRoot;
	}

	protected getWidgetInteractiveArea(widget: HTMLElement): HTMLElement {
		const widgetInteractiveArea =
			this.widgetInteractiveAreaProvider.getInteractiveArea(widget);

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

export { WidgetInitializer };
