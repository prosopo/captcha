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

import { widgetLanguageHeaders } from "@prosopo/locale";
import {
	BUNDLE_ORIGIN_HEADER,
	BUNDLE_VERSION_HEADER,
	integrationHeaders,
} from "@prosopo/types";
import { version } from "@prosopo/util";

/**
 * Where this code was loaded from: https://js.prosopo.io for the hosted
 * bundle, and the site's own origin when it serves a copy of the bundle or
 * builds the npm packages into its app.
 */
export const originOf = (moduleUrl: string | undefined): string | undefined => {
	if (!moduleUrl) return undefined;
	try {
		const { origin } = new URL(moduleUrl);
		return origin === "null" ? undefined : origin;
	} catch {
		return undefined;
	}
};

/**
 * The IIFE build compiles `import.meta.url` to undefined, and its modules
 * initialise lazily, after `document.currentScript` has been cleared. The top
 * frame of a stack trace still names the file the running code came from.
 */
export const scriptUrlFromStack = (
	stack: string | undefined,
): string | undefined => stack?.match(/https?:\/\/[^\s)]+/)?.[0];

export const bundleHeaders = (
	bundleVersion: string,
	bundleOrigin: string | undefined,
): Record<string, string> => ({
	[BUNDLE_VERSION_HEADER]: bundleVersion,
	...(bundleOrigin && { [BUNDLE_ORIGIN_HEADER]: bundleOrigin }),
});

const BUNDLE_HEADERS = bundleHeaders(
	version,
	originOf(import.meta.url) ?? originOf(scriptUrlFromStack(new Error().stack)),
);

/** The headers the widget sends with every provider request. */
export const widgetRequestHeaders = (
	siteLanguage: string | undefined,
	integration?: string,
): Record<string, string> => ({
	...widgetLanguageHeaders(siteLanguage),
	...BUNDLE_HEADERS,
	...integrationHeaders(integration),
});
