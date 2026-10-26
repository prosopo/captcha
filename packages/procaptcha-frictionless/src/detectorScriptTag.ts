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

import { DETECTOR_REGISTRY_KEY, DetectorLoadFailure } from "@prosopo/types";
import type { DetectorType } from "./detectorLoader.js";

export class DetectorLoadError extends Error {
	constructor(
		readonly reason: DetectorLoadFailure,
		readonly cause?: unknown,
	) {
		super(`detector load failed: ${reason}`);
		this.name = "DetectorLoadError";
	}
}

type DetectorExports = { default: DetectorType };
type DetectorRegistry = Map<string, (exports: DetectorExports) => void>;

const registry = (): DetectorRegistry => {
	const key = Symbol.for(DETECTOR_REGISTRY_KEY);
	const host = globalThis as unknown as Record<
		symbol,
		DetectorRegistry | undefined
	>;
	const existing = host[key];
	if (existing) return existing;
	const created: DetectorRegistry = new Map();
	host[key] = created;
	return created;
};

// TypeScript's DOM lib does not declare Trusted Types yet.
type ScriptUrlPolicy = { createScriptURL: (url: string) => unknown };
type TrustedTypesFactory = {
	createPolicy: (
		name: string,
		rules: { createScriptURL: (url: string) => string },
	) => ScriptUrlPolicy;
};

const TRUSTED_TYPES_POLICY = "prosopo-detector";
let scriptUrlPolicy: ScriptUrlPolicy | undefined;

/**
 * Assigns `src` through a Trusted Types policy when the page has the API, so
 * a page enforcing `require-trusted-types-for 'script'` accepts it as long as
 * its `trusted-types` directive allows this policy name. Throws when it does
 * not, which the caller reports as a CSP block.
 */
const setScriptSrc = (script: HTMLScriptElement, url: string): void => {
	const factory = (globalThis as { trustedTypes?: TrustedTypesFactory })
		.trustedTypes;
	if (!factory) {
		script.src = url;
		return;
	}
	scriptUrlPolicy ??= factory.createPolicy(TRUSTED_TYPES_POLICY, {
		createScriptURL: (input) => input,
	});
	Reflect.set(script, "src", scriptUrlPolicy.createScriptURL(url));
};

/** A nonce the page already trusts, for policies that allowlist by nonce. */
const pageNonce = (doc: Document): string | undefined =>
	doc.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || undefined;

export const DETECTOR_SCRIPT_TIMEOUT_MS = 10_000;

/**
 * Loads a provider-served detector bundle with `<script type="module" src>`.
 *
 * A module script cannot hand its exports back to whoever injected it, so a
 * resolver is registered under the script URL first and the bundle calls it
 * with its exports when it evaluates. `load` fires after evaluation, so a
 * `load` with no registration means the bundle predates self-registration or
 * threw while evaluating.
 *
 * Rejects with a {@link DetectorLoadError} naming why.
 */
export const DetectorLoaderFromUrl = (
	url: string,
	doc: Document = document,
	timeoutMs: number = DETECTOR_SCRIPT_TIMEOUT_MS,
): Promise<DetectorType> =>
	new Promise<DetectorType>((resolve, reject) => {
		const entries = registry();
		const target = new URL(url);
		const script = doc.createElement("script");
		let cspBlocked = false;
		let settled = false;

		const onViolation = (event: SecurityPolicyViolationEvent): void => {
			if (event.blockedURI === url || event.blockedURI === target.origin) {
				cspBlocked = true;
			}
		};

		const finish = (outcome: () => void): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			entries.delete(url);
			doc.removeEventListener("securitypolicyviolation", onViolation);
			script.remove();
			outcome();
		};

		const fail = (reason: DetectorLoadFailure, cause?: unknown): void =>
			finish(() => reject(new DetectorLoadError(reason, cause)));

		const timer = setTimeout(
			() => fail(DetectorLoadFailure.scriptLoadError),
			timeoutMs,
		);

		entries.set(url, (exports) => finish(() => resolve(exports.default)));
		doc.addEventListener("securitypolicyviolation", onViolation);

		script.type = "module";
		script.crossOrigin = "anonymous";
		const nonce = pageNonce(doc);
		if (nonce) script.nonce = nonce;
		script.onload = () => fail(DetectorLoadFailure.scriptNotRegistered);
		// The violation event is queued as its own task and can land after
		// `error`, so give it one turn before deciding which failure this was.
		script.onerror = () =>
			setTimeout(() =>
				fail(
					cspBlocked
						? DetectorLoadFailure.scriptCspBlocked
						: DetectorLoadFailure.scriptLoadError,
				),
			);

		try {
			setScriptSrc(script, url);
		} catch (err) {
			fail(DetectorLoadFailure.scriptCspBlocked, err);
			return;
		}
		(doc.head ?? doc.documentElement).appendChild(script);
	});
