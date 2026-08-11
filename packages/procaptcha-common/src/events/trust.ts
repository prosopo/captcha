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

// Replaced at bundle time by vite's `define` — see the `define` block in
// packages/procaptcha-bundle/vite.config.ts. Typed as possibly undefined
// because a build that doesn't define it leaves the identifier undeclared,
// which is why the read below is guarded by `typeof`.
declare const __PROSOPO_ALLOW_UNTRUSTED_EVENTS__: boolean | undefined;

export interface TrustableEvent {
	readonly isTrusted: boolean;
}

/**
 * Whether an event came from a real user rather than a script.
 *
 * The widget acts only on trusted input: a synthetic event is precisely how a
 * bot drives a page, so honouring one would hand over the captcha for free.
 *
 * The single exception is the firefox cypress leg. cypress can only dispatch
 * trusted input through the chrome devtools protocol, which it exposes for
 * chromium browsers only, so on firefox every spec clicks synthetically.
 * Building with PROSOPO_ALLOW_UNTRUSTED_EVENTS=1 opens the gate for that leg.
 * Production builds pin the constant to false and the branch folds away, so
 * the allowance cannot reach a shipped bundle.
 */
export function isEventTrusted(event: TrustableEvent): boolean {
	if (event.isTrusted) {
		return true;
	}
	return (
		typeof __PROSOPO_ALLOW_UNTRUSTED_EVENTS__ !== "undefined" &&
		__PROSOPO_ALLOW_UNTRUSTED_EVENTS__
	);
}
