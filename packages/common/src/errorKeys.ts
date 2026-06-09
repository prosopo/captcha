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

import type { TranslationKey } from "@prosopo/locale";

// Single source of truth for all valid API error keys
export const API_ERROR_KEYS = {
	FORBIDDEN: "API.FORBIDDEN",
	NO_CONTENT_TYPE_HEADER: "API.NO_CONTENT_TYPE_HEADER",
	MISSING_QUERY_PARAMETERS: "API.MISSING_QUERY_PARAMETERS",
	MISSING_BODY: "API.MISSING_BODY",
	INVALID_BODY: "API.INVALID_BODY",
	PARSE_ERROR: "API.PARSE_ERROR",
	MISSING_AUTHORIZATION_HEADER: "API.MISSING_AUTHORIZATION_HEADER",
	INVALID_AUTHORIZATION_HEADER: "API.INVALID_AUTHORIZATION_HEADER",
	INSUFFICIENT_PERMISSIONS: "API.INSUFFICIENT_PERMISSIONS",
	NO_PERMISSIONS: "API.NO_PERMISSIONS",
	FEATURE_NOT_ENABLED: "API.FEATURE_NOT_ENABLED",
	SITE_KEY_NOT_REGISTERED: "API.SITE_KEY_NOT_REGISTERED",
	INVALID_SITE_KEY: "API.INVALID_SITE_KEY",
	INVALID_DOMAIN: "API.INVALID_DOMAIN",
	PROVIDER_VERIFY_FAILED: "API.PROVIDER_VERIFY_FAILED",
	TIMESTAMP_TOO_OLD: "API.TIMESTAMP_TOO_OLD",
	UNKNOWN: "API.UNKNOWN",
} as const;

export const GENERAL_ERROR_KEYS = {
	ACCOUNT_NOT_FOUND: "GENERAL.ACCOUNT_NOT_FOUND",
	SITE_KEY_NOT_FOUND: "GENERAL.SITE_KEY_NOT_FOUND",
	MISSING_SECRET_KEY: "GENERAL.MISSING_SECRET_KEY",
	INVALID_SIGNATURE: "GENERAL.INVALID_SIGNATURE",
} as const;

export const PORTAL_ERROR_KEYS = {
	CANNOT_MODIFY_OWNER_USER: "PORTAL.CANNOT_MODIFY_OWNER_USER",
	CANNOT_MODIFY_USER: "PORTAL.CANNOT_MODIFY_USER",
	CANNOT_DELETE_OWN_USER: "PORTAL.CANNOT_DELETE_OWN_USER",
	CANNOT_DELETE_LAST_USER: "PORTAL.CANNOT_DELETE_LAST_USER",
	USER_ALREADY_EXISTS: "PORTAL.USER_ALREADY_EXISTS",
	NO_SUGGESTIONS_FOUND: "PORTAL.NO_SUGGESTIONS_FOUND",
	CANNOT_DEACTIVATE_LAST_SITE: "PORTAL.CANNOT_DEACTIVATE_LAST_SITE",
	API_KEYS_INVALID_NUMBER_OF_SITES: "PORTAL.API_KEYS_INVALID_NUMBER_OF_SITES",
	API_KEYS_NOT_FOUND: "PORTAL.API_KEYS_NOT_FOUND",
} as const;

export const BILLING_ERROR_KEYS = {
	STRIPE_PORTAL: "BILLING.STRIPE_PORTAL",
	STRIPE_SESSION_NOT_FOUND: "BILLING.STRIPE_SESSION_NOT_FOUND",
	STRIPE_PAYMENT_FAILED: "BILLING.STRIPE_PAYMENT_FAILED",
} as const;

// Union of all error keys
export const ALL_ERROR_KEYS = {
	...API_ERROR_KEYS,
	...GENERAL_ERROR_KEYS,
	...PORTAL_ERROR_KEYS,
	...BILLING_ERROR_KEYS,
} as const;

// Derive type from keys - this gives TypeScript enforcement
export type ValidErrorKey =
	| (typeof API_ERROR_KEYS)[keyof typeof API_ERROR_KEYS]
	| (typeof GENERAL_ERROR_KEYS)[keyof typeof GENERAL_ERROR_KEYS]
	| (typeof PORTAL_ERROR_KEYS)[keyof typeof PORTAL_ERROR_KEYS]
	| (typeof BILLING_ERROR_KEYS)[keyof typeof BILLING_ERROR_KEYS];

// Array of all keys for the Vite plugin
export const BACKEND_ERROR_KEYS_ARRAY = Object.values(ALL_ERROR_KEYS);

// Type-level validation: ensure all error keys exist in translation.json
// Each ValidErrorKey must be assignable to TranslationKey (derived from translation JSON)
// If this errors, a key is defined here but missing from the translation file.
export const _validateErrorKeysExistInTranslations: Record<ValidErrorKey, unknown> = {} as Record<
	ValidErrorKey,
	TranslationKey
>;
