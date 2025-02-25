// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

<<<<<<<< HEAD:packages/provider/src/express.d.ts
import type { TFunction } from "i18next";

declare module "express-serve-static-core" {
	interface Request {
		t: TFunction;
		i18n: {
			t: TFunction;
		};
	}
========
import type { i18n } from "i18next";

async function loadI18next(backend: boolean): Promise<i18n> {
	return new Promise((resolve, reject) => {
		try {
			if (backend) {
				import("./i18nBackend.js").then(({ default: initializeI18n }) => {
					resolve(initializeI18n());
				});
			} else {
				import("./i18nFrontend.js").then(({ default: initializeI18n }) => {
					resolve(initializeI18n());
				});
			}
		} catch (e) {
			reject(e);
		}
	});
>>>>>>>> prosopo/staging:packages/locale/src/loadI18next.ts
}

export default loadI18next;
