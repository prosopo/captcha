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

import type { Logger } from "@prosopo/common";

/**
 * Hardcoded demo keys for testing (Polkadot.js sr25519 well-known accounts)
 * These keys should NEVER be used in production
 */
export const DEMO_KEY_ALWAYS_PASS =
	"5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"; // Dave
export const DEMO_KEY_ALWAYS_FAIL =
	"5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL"; // Ferdie

export enum DemoKeyBehavior {
	AlwaysPass = "always_pass",
	AlwaysFail = "always_fail",
}

/**
 * Check if demo keys are enabled in the environment
 */
export function areDemoKeysEnabled(): boolean {
	const enabledEnvs = process.env.DEMO_KEYS_ALLOWED_ENVIRONMENTS?.split(
		",",
	) || ["development", "test"];
	const currentEnv = process.env.NODE_ENV || "development";

	// Prevent demo keys in production
	if (currentEnv === "production") {
		return false;
	}

	return enabledEnvs.includes(currentEnv);
}

/**
 * Check if a site key is the hardcoded "always pass" demo key
 */
export function isAlwaysPassDemoKey(siteKey: string): boolean {
	return areDemoKeysEnabled() && siteKey === DEMO_KEY_ALWAYS_PASS;
}

/**
 * Check if a site key is the hardcoded "always fail" demo key
 */
export function isAlwaysFailDemoKey(siteKey: string): boolean {
	return areDemoKeysEnabled() && siteKey === DEMO_KEY_ALWAYS_FAIL;
}

/**
 * Get the demo key behavior for a site key
 */
export function getDemoKeyBehavior(siteKey: string): DemoKeyBehavior | null {
	if (isAlwaysPassDemoKey(siteKey)) {
		return DemoKeyBehavior.AlwaysPass;
	}
	if (isAlwaysFailDemoKey(siteKey)) {
		return DemoKeyBehavior.AlwaysFail;
	}
	return null;
}

/**
 * Check if we should bypass normal logic for a demo key with specific behavior
 */
export function shouldBypassForDemoKey(
	siteKey: string,
	behavior: DemoKeyBehavior,
): boolean {
	const keyBehavior = getDemoKeyBehavior(siteKey);
	return keyBehavior === behavior;
}

/**
 * Log demo key usage with warning
 */
export function logDemoKeyUsage(
	logger: Logger,
	siteKey: string,
	behavior: DemoKeyBehavior | null,
	action: string,
): void {
	logger.warn(() => ({
		msg: "⚠️ DEMO KEY IN USE - NOT FOR PRODUCTION",
		data: {
			siteKey,
			behavior,
			action,
			environment: process.env.NODE_ENV,
		},
	}));
}
