import type { TFunction } from "i18next";

declare module "express-serve-static-core" {
	interface Request {
		t: TFunction;
		i18n: {
			t: TFunction;
		};
	}
}
