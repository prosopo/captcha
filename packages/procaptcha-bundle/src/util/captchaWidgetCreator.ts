import {
	CaptchaType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import { type WidgetCreator, darkTheme, lightTheme } from "@prosopo/widget";
import type { Root } from "react-dom/client";
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";

class CaptchaWidgetCreator {
	private captchaRenderer: CaptchaRenderer | null = null;

	public constructor(private readonly widgetCreator: WidgetCreator) {}

	public async createCaptchaWidget(
		container: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Promise<Root> {
		const widgetTheme = "light" === config.theme ? lightTheme : darkTheme;

		const widgetInteractiveArea = this.widgetCreator.createWidget(
			container,
			widgetTheme,
		);

		// fixme
		console.log("optimization: widget was attached to the DOM", {
			performance: performance.now(),
		});

		// all the captcha-rendering logic is lazy-loaded, to avoid react & zod delay the initial widget creation.

		const captchaRenderer = await this.getCaptchaRenderer();

		const captchaRoot = await captchaRenderer.renderCaptcha(
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

	protected async getCaptchaRenderer(): Promise<CaptchaRenderer> {
		if (null === this.captchaRenderer) {
			this.captchaRenderer = await this.createCaptchaRenderer();
		}

		return this.captchaRenderer;
	}

	protected async createCaptchaRenderer(): Promise<CaptchaRenderer> {
		// fixme add 10 seconds delay

		const CaptchaRenderer = (await import("./captcha/captchaRenderer.js"))
			.CaptchaRenderer;

		const CaptchaComponentProvider = (
			await import("./captcha/captchaComponentProvider.js")
		).CaptchaComponentProvider;

		return new CaptchaRenderer(new CaptchaComponentProvider());
	}
}

export { CaptchaWidgetCreator };
