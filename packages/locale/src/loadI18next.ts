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
let i18nInstance: i18n;

/**
 * How long to wait for i18next to report `loaded` before giving up on it.
 *
 * Resolution is driven by an event, and events are not guaranteed: a backend
 * that never answers (http backend against a dead CDN, fs backend against a
 * missing locales dir) leaves the listener armed and the promise pending for
 * the lifetime of the process. `cli.ts` calls loadI18next(true).then(...) with
 * nothing to time it out, so a pending promise there is a silent boot hang with
 * no log line to explain it.
 */
export const I18N_LOAD_TIMEOUT_MS = 10_000;

const reconcileLanguage = async (
	instance: i18n,
	lng: string | undefined,
): Promise<i18n> => {
	if (lng && instance.language !== lng) {
		await instance.changeLanguage(lng);
	}
	return instance;
};

async function loadI18next(backend: boolean, lng?: string): Promise<i18n> {
	return new Promise((resolve, reject) => {
		// On timeout we resolve with the (possibly not fully loaded) instance
		// rather than rejecting. i18next falls back to the key itself when a
		// resource is missing, so a degraded instance renders untranslated text;
		// a rejection instead takes down the caller, and neither caller handles
		// one — cli.ts has no .catch, and widgetFactory awaits it inside the
		// render path, so the widget would not appear at all. Untranslated beats
		// absent. Genuine errors still reject: this arm only fires on silence.
		let settled = false;
		// No `settled` guard needed here: both latches clear this timer, so it
		// can only fire while nothing has settled.
		const timer = setTimeout(() => {
			settled = true;
			if (i18nInstance) {
				resolve(i18nInstance);
			} else {
				reject(
					new Error(
						`i18next did not load within ${I18N_LOAD_TIMEOUT_MS}ms and no instance was created`,
					),
				);
			}
		}, I18N_LOAD_TIMEOUT_MS);
		// Node keeps the event loop alive for a pending timer, which would hold
		// a short-lived CLI process open for the full timeout after it had
		// otherwise finished.
		timer.unref?.();

		// Both latches are one-shot: i18next can emit `loaded` more than once
		// (per namespace, and again after changeLanguage), and a late event
		// arriving after the timeout must not re-settle or leak a second timer.
		const done = (instance: i18n): void => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			resolve(instance);
		};
		const failWith = (error: unknown): void => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			reject(error);
		};

		// Every asynchronous branch below terminates in `.catch(failWith)`. A
		// synchronous try/catch cannot see a rejected dynamic import or a
		// rejected changeLanguage(), so without these the executor would
		// simply return and the promise would stay pending forever — callers
		// (i18nMiddleware, and through it the whole server bootstrap) would
		// hang rather than fail.
		if (backend) {
			import("./i18nBackend.js")
				.then(({ default: initializeI18n }) => {
					if (!i18nInstance) {
						// pass the resolver into the i18n init fn which will resolve after i18n connected fires
						i18nInstance = initializeI18n(done);
					} else {
						// we've already initialised i18n so just return it
						done(i18nInstance);
					}
				})
				.catch(failWith);
		} else {
			import("./i18nFrontend.js")
				.then(({ default: initializeI18n }) => {
					if (!i18nInstance) {
						// Pass `lng` in on first init so browser detection is skipped
						// entirely when the site owner has supplied a language. The
						// resolver only fires on the `loaded` event, so at resolve
						// time the target-language resources are guaranteed present.
						i18nInstance = initializeI18n((instance) => {
							void reconcileLanguage(instance, lng).then(done).catch(failWith);
						}, lng);
					} else {
						// Singleton already exists (e.g. a prior widget mounted with a
						// different language, or a React consumer initialised earlier).
						// Reconcile before resolving so callers can render synchronously
						// against the requested language instead of seeing a flash of
						// the previous one.
						void reconcileLanguage(i18nInstance, lng)
							.then(done)
							.catch(failWith);
					}
				})
				.catch(failWith);
		}
	});
}

export type { i18n as Ti18n };

export default loadI18next;
