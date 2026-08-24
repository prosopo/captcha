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

import {
	type ContextType,
	type IUserSettings,
	contextAwareThresholdDefault,
	contextTypeFromSession,
	expandContexts,
} from "@prosopo/types";

/**
 * Determines the context a request belongs to — its device family crossed
 * with whether it is running in a webview.
 *
 * `userAgent` is the raw header value, not the hashed one carried on the
 * decrypted payload. The entropy sweep classifies stored sessions from the
 * same header through the same function, so the two sides agree on which
 * bucket a session lands in.
 *
 * @param userAgent - Raw `user-agent` request header
 * @param webView - Whether the request is from a WebView
 */
export function determineContextType(
	userAgent: string | undefined,
	webView: boolean,
): ContextType {
	return contextTypeFromSession(userAgent, webView);
}

/**
 * Whether the client has this context configured.
 *
 * A context the customer has not enabled is not validated at all — the
 * request passes through this stage untouched. That is a change from the
 * pre-device-type behaviour, where configuring a single context validated
 * *every* request against it: with six contexts, applying a tablet baseline
 * to desktop traffic would reject real users wholesale.
 */
export function isContextConfigured(
	settings: IUserSettings,
	contextType: ContextType,
): boolean {
	return (
		expandContexts(settings.contextAware?.contexts)[contextType] !== undefined
	);
}

/**
 * Gets the threshold for a specific context type from client settings.
 *
 * Falls back to the global default when the context is unconfigured, so a
 * caller that skipped `isContextConfigured` still gets a sane number rather
 * than NaN.
 *
 * @param settings - Client settings
 * @param contextType - The context type to get the threshold for
 * @returns The threshold for the context type, or the global threshold if not configured
 */
export function getContextThreshold(
	settings: IUserSettings,
	contextType: ContextType,
): number {
	const contexts = expandContexts(settings.contextAware?.contexts);
	return contexts[contextType]?.threshold ?? contextAwareThresholdDefault;
}
