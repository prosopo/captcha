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

// Sent by the widget with every provider request. The provider must list both
// in its CORS allowedHeaders before any widget sends them, or the browser
// rejects the preflight and the widget cannot reach the provider.
export const BUNDLE_VERSION_HEADER = "X-Prosopo-Bundle-Version";
export const BUNDLE_ORIGIN_HEADER = "X-Prosopo-Bundle-Origin";

const BUNDLE_VERSION =
	/^(?:\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[0-9A-Za-z.-]{1,32})?|dev)$/;
const MAX_ORIGIN_LENGTH = 255;

/** A release number ("3.9.6", "3.9.6-rc.1") or "dev"; anything else is dropped. */
export const normaliseBundleVersion = (
	value: string | undefined,
): string | undefined => {
	const version: string | undefined = value?.trim();
	return version && BUNDLE_VERSION.test(version) ? version : undefined;
};

/** The http(s) origin of a URL-like value, or undefined. */
export const normaliseBundleOrigin = (
	value: string | undefined,
): string | undefined => {
	if (!value || value.length > MAX_ORIGIN_LENGTH) {
		return undefined;
	}
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.origin
			: undefined;
	} catch {
		return undefined;
	}
};
