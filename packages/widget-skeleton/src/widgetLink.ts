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

/** What a link out of the widget tells the page it opens. */
export interface WidgetLinkContext {
	/** The site the widget is on. */
	readonly host?: string;
	readonly siteKey?: string;
	/** The site's chosen widget language, else the browser's. */
	readonly language?: string;
}

/** Which part of the widget the visitor clicked. */
export type WidgetLinkMedium = "logo" | "error";

/**
 * `destination` with the site, site key, clicked element and language added,
 * in the same parameters hCaptcha uses, so analytics can tell which site and
 * key a visitor came from.
 */
export function widgetLinkUrl(
	destination: string,
	medium: WidgetLinkMedium,
	{ host, siteKey, language }: WidgetLinkContext = {},
): string {
	const url = new URL(destination);
	if (host) {
		url.searchParams.set("ref", host);
	}
	if (siteKey) {
		url.searchParams.set("utm_campaign", siteKey);
	}
	url.searchParams.set("utm_medium", medium);
	if (language) {
		url.searchParams.set("hl", language);
	}
	return url.href;
}
