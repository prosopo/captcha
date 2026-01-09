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
	ContextType,
	type IUserSettings,
	contextAwareThresholdDefault,
} from "@prosopo/types";

/**
 * Determines the context type based on the webView flag
 * @param webView - Whether the request is from a WebView
 * @returns The context type (Webview or Default)
 */
export function determineContextType(webView: boolean): ContextType {
	return webView ? ContextType.Webview : ContextType.Default;
}

/**
 * Gets the threshold for a specific context type from client settings
 * @param settings - Client settings
 * @param contextType - The context type to get the threshold for
 * @returns The threshold for the context type, or the global threshold if not configured
 */
export function getContextThreshold(
	settings: IUserSettings,
	contextType: ContextType,
): number {
	const contextAware = settings.contextAware;
	if (contextAware === undefined) {
		return contextAwareThresholdDefault;
	}

	const contexts = contextAware.contexts;
	let contextConfig: { type: ContextType; threshold: number } | undefined;

	if (contexts !== undefined) {
		contextConfig = (
			contexts as Partial<
				Record<ContextType, { type: ContextType; threshold: number }>
			>
		)[contextType];
	}

	return contextConfig?.threshold ?? contextAwareThresholdDefault;
}
