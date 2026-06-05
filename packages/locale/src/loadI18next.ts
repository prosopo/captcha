// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import type { i18n } from "i18next";

let frontendInstance: i18n | undefined;
let frontendPromise: Promise<i18n> | undefined;

let backendInstance: i18n | undefined;
let backendPromise: Promise<i18n> | undefined;

export async function loadI18nextFrontend(): Promise<i18n> {
	if (frontendInstance) return frontendInstance;
	if (!frontendPromise) {
		frontendPromise = import("./i18nFrontend.js").then(
			({ default: initializeI18n }) =>
				new Promise<i18n>((resolve, reject) => {
					try {
						frontendInstance = initializeI18n((i18n) => {
							frontendInstance = i18n;
							resolve(i18n);
						});
					} catch (e) {
						reject(e);
					}
				}),
		);
	}
	return frontendPromise;
}

export async function loadI18nextBackend(): Promise<i18n> {
	if (backendInstance) return backendInstance;
	if (!backendPromise) {
		backendPromise = import("./i18nBackend.js").then(
			({ default: initializeI18n }) =>
				new Promise<i18n>((resolve, reject) => {
					try {
						backendInstance = initializeI18n((i18n) => {
							backendInstance = i18n;
							resolve(i18n);
						});
					} catch (e) {
						reject(e);
					}
				}),
		);
	}
	return backendPromise;
}

export async function loadI18next(backend: boolean): Promise<i18n> {
	return backend ? loadI18nextBackend() : loadI18nextFrontend();
}

export type { i18n as Ti18n };

export default loadI18next;
