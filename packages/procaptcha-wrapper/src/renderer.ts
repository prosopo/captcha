import type { ProcaptchaRenderOptions } from "@prosopo/types";

export type RendererFunction = (
	element: HTMLElement,
	options: ProcaptchaRenderOptions,
) => Promise<void>;

export const createRenderer = (
	scriptUrl: string,
	scriptId: string,
): RendererFunction => {
	let renderFunction: RendererFunction;

	const getRenderFunction = async (): Promise<RendererFunction> => {
		if (!renderFunction) {
			renderFunction = await loadRenderFunction(scriptUrl, {
				id: scriptId,
				type: "module",
				async: true,
				defer: true,
			});
		}

		return renderFunction;
	};

	return async (
		element: HTMLElement,
		options: ProcaptchaRenderOptions,
	): Promise<void> => {
		// cloning gives us a writable and independent object, which the render function then may change.
		// reason: some frameworks, like React, lock extending, and direct operations lead to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
		const renderOptions = Object.assign({}, options);

		const renderFunction = await getRenderFunction();

		await renderFunction(element, renderOptions);
	};
};

const loadRenderFunction = async (
	scriptUrl: string,
	scriptAttributes?: Partial<HTMLScriptElement>,
): Promise<RendererFunction> => {
	await loadScript(scriptUrl, scriptAttributes);

	if (undefined === window.procaptcha?.render) {
		throw new Error("Render script does not contain the render function");
	}

	return window.procaptcha.render;
};

const loadScript = async (
	url: string,
	attributes?: Partial<HTMLScriptElement>,
): Promise<void> => {
	const scriptTag = document.createElement("script");

	const scriptAttributes: Partial<HTMLScriptElement> = {
		src: url,
		...attributes,
	};

	Object.assign(scriptTag, scriptAttributes);

	await insertScriptTag(document.head, scriptTag);
};

const insertScriptTag = async (
	target: HTMLElement,
	scriptTag: HTMLScriptElement,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		scriptTag.onload = () => {
			resolve();
		};

		scriptTag.onerror = (event: Event | string) => {
			reject(event);
		};

		target.appendChild(scriptTag);
	});
};

declare global {
	interface Window {
		procaptcha:
			| {
					render: RendererFunction;
			  }
			| undefined;
	}
}
