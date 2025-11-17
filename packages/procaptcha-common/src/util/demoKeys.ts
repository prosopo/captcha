// Copyright 2021-2025 Prosopo (UK) Ltd.
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
 */
export const DEMO_KEY_ALWAYS_PASS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"; // Alice
export const DEMO_KEY_ALWAYS_FAIL = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"; // Eve

export type DemoKeyBehavior = "always_pass" | "always_fail" | null;

/**
 * Check if a site key is a demo key and return its behavior
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
 */
export function isDemoKey(siteKey: string): boolean {
	return getDemoKeyBehavior(siteKey) !== null;
}

