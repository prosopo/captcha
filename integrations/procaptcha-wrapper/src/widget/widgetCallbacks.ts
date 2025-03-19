// https://docs.prosopo.io/en/basics/client-side-rendering/
interface WidgetCallbacks {
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is verified.
	 */
	onVerified?: ((token: string) => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA challenge fails.
	 */
	onFailed?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA challenge expires.
	 */
	onChallengeExpired?: (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is opened.
	 */
	onOpened?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is closed.
	 */
	onClosed?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is reset.
	 */
	onReset?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when an error occurs.
	 */
	onError?: () => ((error: Error) => void) | string;
}

export type { WidgetCallbacks };
