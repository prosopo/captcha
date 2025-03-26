import type { ProcaptchaOptions } from "./procaptchaOptions.js";

interface ProcaptchaWrapper {
	renderProcaptcha(
		element: HTMLElement,
		options: ProcaptchaOptions,
	): Promise<void>;
}

export type { ProcaptchaWrapper };
