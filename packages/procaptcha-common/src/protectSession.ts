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

import { INPUT_LIMITS } from "@prosopo/types";

const PROTECT_GLOBAL = "prosopo_protect";
const PROTECT_COOKIE = "prosopo_session";

type ProtectGlobal = {
	jti?: unknown;
};

const isProtectGlobal = (value: unknown): value is ProtectGlobal =>
	typeof value === "object" && value !== null;

/**
 * `bumblebee-<uuid>` today, but the prefix names the edge that issued the
 * session, so this only rejects what could not be an id at all.
 *
 * The length bound is load-bearing rather than defensive: the provider caps
 * `clientSessionId` at `INPUT_LIMITS.ID` and rejects the whole solution body
 * when it is longer, so an oversized value here would fail the solve rather
 * than just losing the correlation.
 */
const isUsableJti = (value: string): boolean =>
	value.length > 0 &&
	value.length <= INPUT_LIMITS.ID &&
	/^[A-Za-z0-9._-]+$/.test(value);

const readGlobalJti = (): string | undefined => {
	const global: unknown = Reflect.get(window, PROTECT_GLOBAL);
	if (!isProtectGlobal(global) || typeof global.jti !== "string") {
		return undefined;
	}
	const jti = global.jti.trim();
	return isUsableJti(jti) ? jti : undefined;
};

const readCookieJti = (): string | undefined => {
	if (typeof document === "undefined") {
		return undefined;
	}
	for (const pair of document.cookie.split(";")) {
		const separator = pair.indexOf("=");
		if (
			separator === -1 ||
			pair.slice(0, separator).trim() !== PROTECT_COOKIE
		) {
			continue;
		}
		// The cookie is `{jti}|{jwt}`. The second half is a bearer token for the
		// Protect session and must never leave the page.
		const jti = pair
			.slice(separator + 1)
			.trim()
			.split("|")[0];
		return jti !== undefined && isUsableJti(jti) ? jti : undefined;
	}
	return undefined;
};

/**
 * The Protect session id (JTI) for this page, when the site runs Prosopo
 * Protect alongside the captcha.
 *
 * Protect publishes it two ways, both read here: `window.prosopo_protect.jti`,
 * and the `prosopo_session` cookie it sets on the registrable domain (so a
 * session minted at `protect.example.com` is visible on `www.example.com`).
 * The global is preferred — it is the value Protect itself is using, whereas
 * the cookie may have been rewritten by anything on the page.
 *
 * Undefined whenever the site does not run Protect, the widget is embedded
 * cross-origin, or Protect has not finished initialising. Every caller treats
 * that as "no correlation available", never as a fault.
 */
export const getProtectJti = (): string | undefined => {
	if (typeof window === "undefined") {
		return undefined;
	}
	try {
		return readGlobalJti() ?? readCookieJti();
	} catch {
		// `document.cookie` throws in a sandboxed iframe, and a page is free to
		// define `prosopo_protect` as a throwing getter.
		return undefined;
	}
};

/**
 * The session id this widget reports to the provider: whatever the site asked
 * for, and Protect's session id only when the site asked for nothing.
 *
 * One function so the precedence is stated once — the frictionless request and
 * the solution submit have to agree on it, or the provider's own
 * mismatch check would fire on a session it built both halves of.
 */
export const resolveClientSessionId = (
	clientSessionId?: string,
): string | undefined => clientSessionId || getProtectJti();
