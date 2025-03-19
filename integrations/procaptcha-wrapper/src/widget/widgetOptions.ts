import type { WidgetCallbacks } from "./widgetCallbacks.js";
import type { WidgetCaptchaTypes } from "./widgetCaptchaTypes.js";
import type { WidgetTheme } from "./widgetTheme.js";

// https://docs.prosopo.io/en/basics/client-side-rendering/
interface WidgetOptions {
	/**
	 * The site key of your application / website.
	 * */
	siteKey: string;
	/**
	 * The theme of the CAPTCHA widget
	 * */
	theme?: WidgetTheme;
	/**
	 * The type of CAPTCHA to render.
	 */
	captchaType?: WidgetCaptchaTypes;
	callbacks?: WidgetCallbacks;
	/**
	 * The language of the CAPTCHA widget.
	 */
	language?: string;
	/**
	 * The amount of time, in milliseconds, a successful CAPTCHA challenge is valid for.
	 * Defaults to 2 minutes.
	 */
	challengeValidLengthMs?: number;
}

export type { WidgetOptions };
