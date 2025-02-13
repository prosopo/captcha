import type { i18n } from "i18next";

const isClientSide = (): boolean => {
	return !!(
		typeof window !== "undefined" &&
		window.document &&
		window.document.createElement
	);
};

const isClientSideOrFrontendVar = () => {
	return isClientSide() || process.env.FRONTEND;
};

async function loadi18next(): Promise<i18n> {
	return new Promise((resolve, reject) => {
		if (isClientSideOrFrontendVar()) {
			import("@prosopo/locale-node").then(({ i18nFrontend }) => {
				resolve(i18nFrontend);
			});
		} else {
			import("@prosopo/locale-node").then(({ i18nBackend }) => {
				resolve(i18nBackend);
			});
		}
	});
}

export default loadi18next;
