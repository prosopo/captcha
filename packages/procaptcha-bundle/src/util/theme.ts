import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";


/**
 * Set the theme for the captcha widget. The theme can be set to "light" or "dark". 
 * If the theme is not set, it will default to "light"
 * 
 * @param renderOptions
 * @param element
 * @param config
 */
export const setTheme = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigInput,
) => {
	const themeAttribute =
		renderOptions?.theme || element.getAttribute("data-theme") || "light";
	config.theme = validateTheme(themeAttribute);
};

const customThemeSet = new Set(["light", "dark"]);

const validateTheme = (themeAttribute: string): "light" | "dark" =>
	customThemeSet.has(themeAttribute)
		? (themeAttribute as "light" | "dark")
		: "light";
