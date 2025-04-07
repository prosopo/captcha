import type {ProcaptchaRenderOptions} from "@prosopo/types";

export type RenderProcaptchaFunction = (
	element: HTMLElement,
	options: ProcaptchaRenderOptions,
) => Promise<void>;

export const loadRenderProcaptchaScript = async (
	url: string,
	attributes?: Partial<HTMLScriptElement>,
): Promise<RenderProcaptchaFunction> => {
	const scriptTag = document.createElement("script");

	const scriptAttributes: Partial<HTMLScriptElement> = {
		src: url,
		type: "module",
		async: true,
		defer: true,
		...attributes,
	};

	Object.assign(scriptTag, scriptAttributes);

	await loadScriptTag(scriptTag);

	return window.procaptcha.render;
};

const loadScriptTag = async (scriptTag: HTMLScriptElement): Promise<void> => {
	return new Promise((resolve, reject) => {
		scriptTag.onload = () => {
			resolve();
		};

		scriptTag.onerror = (event: Event | string) => {
			reject(event);
		};

		document.head.appendChild(scriptTag);
	});
};

declare global {
	interface Window {
		procaptcha: {
			render: RenderProcaptchaFunction;
		};
	}
}
