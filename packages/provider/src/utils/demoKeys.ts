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

import type { Logger } from "@prosopo/common";
import { DemoKeyBehavior } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";

/**
 * Check if demo keys are enabled in the environment
 */
export function areDemoKeysEnabled(): boolean {
	const enabledEnvs = process.env.DEMO_KEYS_ALLOWED_ENVIRONMENTS?.split(",") || [
		"development",
		"test",
	];
	const currentEnv = process.env.NODE_ENV || "development";
	return (
		process.env.ENABLE_DEMO_KEYS === "true" &&
		enabledEnvs.includes(currentEnv)
	);
}

/**
 * Check if a client record is a demo key
 */
export function isDemoKey(clientRecord: ClientRecord): boolean {
	return clientRecord.settings?.demoKeyConfig?.enabled === true;
}

/**
 * Get the demo key behavior (always_pass or always_fail)
 */
export function getDemoKeyBehavior(
	clientRecord: ClientRecord,
): DemoKeyBehavior | null {
	if (!isDemoKey(clientRecord)) {
		return null;
	}
	return clientRecord.settings?.demoKeyConfig?.behavior || null;
}

/**
 * Check if we should bypass normal logic for a demo key with specific behavior
 */
export function shouldBypassForDemoKey(
	clientRecord: ClientRecord,
	behavior: DemoKeyBehavior,
): boolean {
	if (!areDemoKeysEnabled()) {
		return false;
	}
	return isDemoKey(clientRecord) && getDemoKeyBehavior(clientRecord) === behavior;
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

/**
 * Validate that demo keys are not being used inappropriately
 */
export function validateDemoKeyEnvironment(): void {
	if (
		process.env.NODE_ENV === "production" &&
		process.env.ENABLE_DEMO_KEYS === "true"
	) {
		throw new Error(
			"CRITICAL: Demo keys are enabled in production environment! This is a security risk.",
		);
	}
}

