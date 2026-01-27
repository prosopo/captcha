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
 * Demo keys for testing - these should match the provider's demo keys
 * Polkadot.js sr25519 well-known accounts
 *
 * These keys provide trivial CAPTCHA challenges for testing purposes:
 * - DEMO_KEY_ALWAYS_PASS: All challenges automatically verify successfully
 * - DEMO_KEY_ALWAYS_FAIL: All challenges fail verification
 */
export const DEMO_KEY_ALWAYS_PASS =
	"5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"; // Dave
export const DEMO_KEY_ALWAYS_FAIL =
	"5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL"; // Ferdie

export type DemoKeyBehavior = "always_pass" | "always_fail" | null;

/**
 * Check if a site key is a demo key and return its behavior
 * @param siteKey - The site key to check
 * @returns The demo key behavior, or null if not a demo key
 */
export function getDemoKeyBehavior(siteKey: string): DemoKeyBehavior {
	if (siteKey === DEMO_KEY_ALWAYS_PASS) {
		return "always_pass";
	}
	if (siteKey === DEMO_KEY_ALWAYS_FAIL) {
		return "always_fail";
	}
	return null;
}

/**
 * Check if a site key is a demo key
 * @param siteKey - The site key to check
 * @returns True if the site key is a demo key, false otherwise
 */
export function isDemoKey(siteKey: string): boolean {
	return getDemoKeyBehavior(siteKey) !== null;
}
