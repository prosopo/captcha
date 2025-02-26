import {
	CaptchaType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import {
	type WidgetSkeletonFactory,
	darkTheme,
	lightTheme,
} from "@prosopo/widget-skeleton";
import type { Root } from "react-dom/client";
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";

class WidgetFactory {
	private captchaRenderer: CaptchaRenderer | null = null;

	public constructor(
		private readonly widgetSkeletonFactory: WidgetSkeletonFactory,
	) {}

	public async createWidgets(
		containers: Element[],
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Promise<Root[]> {
		return Promise.all(
			containers.map((container) =>
				this.createWidget(container, config, renderOptions),
			),
		);
	}

	public async createWidget(
		container: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Promise<Root> {
		const widgetTheme = "light" === config.theme ? lightTheme : darkTheme;

		const widgetInteractiveArea =
			this.widgetSkeletonFactory.createWidgetSkeleton(container, widgetTheme);

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
		// fixme
		return new Promise((resolve) => {
			setTimeout(async () => {
				const CaptchaRenderer = (await import("./captcha/captchaRenderer.js"))
					.CaptchaRenderer;

				const CaptchaComponentProvider = (
					await import("./captcha/captchaComponentProvider.js")
				).CaptchaComponentProvider;

				const captchaRenderer = new CaptchaRenderer(
					new CaptchaComponentProvider(),
				);

				resolve(captchaRenderer);
			}, 10000);
		});
	}
}

export { WidgetFactory };
