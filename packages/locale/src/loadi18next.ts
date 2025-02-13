import type { i18n } from "i18next";
import { isClientSideOrFrontendVar } from "./util.js";

async function loadi18next(): Promise<i18n> {
	return new Promise((resolve, reject) => {
		if (isClientSideOrFrontendVar()) {
			import("@prosopo/locale").then(({ i18nFrontend }) => {
				resolve(i18nFrontend);
			});
		} else {
			import("@prosopo/locale").then(({ i18nBackend }) => {
				resolve(i18nBackend);
			});
		}
	});
}

export default loadi18next;
