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

/**
 * Where a development widget looks for its provider.
 *
 * `localhost` is right when the page and the provider share a machine, and
 * wrong the moment they do not: a phone or a simulator loading the demo over
 * the LAN resolves `localhost` to itself, so the widget never reaches the
 * provider and reports the site key as unregistered. The override exists so
 * that case can be pointed at the host running the provider.
 *
 * Development only — staging and production resolve through their DNS-routed
 * endpoints and ignore this entirely.
 */
export const DEFAULT_DEVELOPMENT_PROVIDER_URL = "https://localhost:9229";

/**
 * Read the override without assuming a runtime.
 *
 * Written as a static `process.env.X` access on purpose: the frontend build
 * substitutes that exact expression for a literal, which a computed lookup
 * (`process.env[key]`) would not match. For the same reason there is no
 * `typeof process` guard — in a browser bundle the whole expression is already
 * a string by the time it runs, and guarding on a `process` that does not
 * exist there would discard it. Under plain node with the variable unset it is
 * simply undefined; where neither applies the access throws and is caught.
 */
export const readDevelopmentProviderUrlOverride = (): string | undefined => {
	try {
		return process.env.PROSOPO_PROVIDER_URL_DEVELOPMENT;
	} catch {
		return undefined;
	}
};

export const getDevelopmentProviderUrl = (
	override: string | undefined = readDevelopmentProviderUrlOverride(),
): string => {
	const trimmed = override?.trim();
	return trimmed
		? trimmed.replace(/\/$/, "")
		: DEFAULT_DEVELOPMENT_PROVIDER_URL;
};
