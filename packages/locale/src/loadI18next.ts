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
let frontendInitialized = false;

let backendInstance: i18n | undefined;
let backendPromise: Promise<i18n> | undefined;
let backendInitialized = false;

export async function loadI18nextFrontend(): Promise<i18n> {
	// Only short-circuit once the instance is fully initialized; while
	// initialization is in flight, fall through to the shared promise so
	// concurrent callers await readiness instead of a half-ready instance.
	if (frontendInstance?.isInitialized) return frontendInstance;
	if (!frontendPromise) {
		frontendPromise = import("./i18nFrontend.js")
			.then(
				({ default: initializeI18n }) =>
					new Promise<i18n>((resolve, reject) => {
						try {
							// Prevent race conditions: only initialize once
							if (frontendInitialized) {
								if (frontendInstance) return resolve(frontendInstance);
								// Still initializing, wait for completion
								return;
							}
							frontendInitialized = true;

							frontendInstance = initializeI18n((i18n) => {
								frontendInstance = i18n;
								resolve(i18n);
							});
							// If init was synchronous (already initialized), resolve now;
							// otherwise the loaded callback above resolves it.
							if (frontendInstance?.isInitialized) {
								resolve(frontendInstance);
							}
						} catch (e) {
							frontendInitialized = false;
							reject(e);
						}
					}),
			)
			.catch((e) => {
				// Reset cached state so a future call can retry after a failure.
				frontendPromise = undefined;
				frontendInitialized = false;
				throw e;
			});
	}
	return frontendPromise;
}

export function getFrontendI18n(): i18n | undefined {
	return frontendInstance;
}

export async function loadI18nextBackend(): Promise<i18n> {
	// Only short-circuit once the instance is fully initialized; while
	// initialization is in flight, fall through to the shared promise so
	// concurrent callers await readiness instead of a half-ready instance.
	if (backendInstance?.isInitialized) return backendInstance;
	if (!backendPromise) {
		backendPromise = import("./i18nBackend.js")
			.then(
				({ default: initializeI18n }) =>
					new Promise<i18n>((resolve, reject) => {
						try {
							// Prevent race conditions: only initialize once
							if (backendInitialized) {
								if (backendInstance) return resolve(backendInstance);
								// Still initializing, wait for completion
								return;
							}
							backendInitialized = true;

							backendInstance = initializeI18n((i18n) => {
								backendInstance = i18n;
								resolve(i18n);
							});
							// If init was synchronous (already initialized), resolve now;
							// otherwise the loaded callback above resolves it.
							if (backendInstance?.isInitialized) {
								resolve(backendInstance);
							}
						} catch (e) {
							backendInitialized = false;
							reject(e);
						}
					}),
			)
			.catch((e) => {
				// Reset cached state so a future call can retry after a failure.
				backendPromise = undefined;
				backendInitialized = false;
				throw e;
			});
	}
	return backendPromise;
}

export async function loadI18next(backend: boolean): Promise<i18n> {
	return backend ? loadI18nextBackend() : loadI18nextFrontend();
}

export type { i18n as Ti18n };

export default loadI18next;
