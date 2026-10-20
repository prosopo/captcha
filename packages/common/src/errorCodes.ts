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

export interface ErrorCodeDefinition {
	/** English text, sent to clients for public codes and used in logs. */
	readonly message: string;
	/** HTTP status a server edge responds with. Defaults to 500. */
	readonly status?: number;
	/** Whether a client may see the code, message and data. Defaults to false. */
	readonly public?: boolean;
}

/**
 * Every kind of failure, frontend and backend alike. The key is the code, in
 * UPPER_SNAKE naming the failure rather than the place (`SITE_KEY_INVALID`,
 * not `PROVIDER_VERIFY_FAILED`): where it happened is the site's job. It is
 * what callers branch on and what the widget translates (`ERRORS.<CODE>`), so
 * renaming one is a breaking API change.
 */
export const ERROR_CODES = {
	BACKEND_ERROR: { message: "Server error" },
	FRONTEND_ERROR: { message: "Unexpected error" },
	UNEXPECTED: { message: "Unexpected error" },
	NOT_IMPLEMENTED: { message: "Method not implemented", status: 501 },
	SERVICE_NOT_READY: { message: "Service not ready", status: 503 },
	CONFIG_INVALID: { message: "Invalid configuration" },
	DB_UNAVAILABLE: { message: "Database unavailable", status: 503 },
	DB_QUERY_FAILED: { message: "Database query failed" },
	RECORD_NOT_FOUND: { message: "Record not found" },
	INVALID_DATA: { message: "Invalid data" },
	DATASET_INVALID: { message: "Invalid dataset" },
	FILE_ERROR: { message: "File error" },
	CLI_INVALID_ARGUMENT: { message: "Invalid parameter" },
	BILLING_FAILED: { message: "Billing error" },

	INVALID_REQUEST: { message: "Invalid request", status: 400, public: true },
	UNAUTHORIZED: { message: "Unauthorized", status: 401, public: true },
	FORBIDDEN: { message: "Forbidden", status: 403, public: true },
	RATE_LIMITED: { message: "Too many requests", status: 429, public: true },
	SITE_KEY_INVALID: { message: "Invalid site key", status: 400, public: true },
	SITE_KEY_NOT_REGISTERED: {
		message: "Site key not registered",
		status: 400,
		public: true,
	},
	ORIGIN_NOT_ALLOWED: {
		message: "Unauthorized origin URL",
		status: 400,
		public: true,
	},
	INVALID_IP: { message: "Invalid IP", status: 400, public: true },
	INVALID_SOLUTION: { message: "Invalid solution", status: 400, public: true },
	INVALID_SALT: { message: "Invalid salt", status: 400, public: true },
	INVALID_TIMESTAMP: {
		message: "Invalid timestamp",
		status: 400,
		public: true,
	},
	TIMESTAMP_TOO_OLD: {
		message: "Timestamp too old",
		status: 400,
		public: true,
	},
	NO_SESSION_FOUND: { message: "No session found", status: 400, public: true },
	SOLUTION_NOT_FOUND: {
		message: "Solution not found",
		status: 400,
		public: true,
	},
	INCORRECT_CAPTCHA_TYPE: {
		message: "Incorrect CAPTCHA type",
		status: 400,
		public: true,
	},
	CAPTCHA_FAILED: {
		message: "You answered one or more captchas incorrectly. Please try again",
		status: 400,
		public: true,
	},
	CLIENT_SESSION_MISMATCH: {
		message: "Session mismatch. The captcha was not completed in this session.",
		status: 400,
		public: true,
	},
	DECISION_MACHINE_DENIED: {
		message: "Denied by the decision machine",
		status: 400,
		public: true,
	},
	FAILED_IP_VALIDATION: {
		message: "IP validation failed",
		status: 400,
		public: true,
	},
	ACCESS_POLICY_BLOCK: {
		message: "Access blocked by policy",
		status: 400,
		public: true,
	},
	ABUSER_BLOCKED: {
		message:
			"Requests from networks flagged for abuse are not allowed for this site",
		status: 400,
		public: true,
	},
	CRAWLER_BLOCKED: {
		message: "Requests from known crawlers are not allowed for this site",
		status: 400,
		public: true,
	},
	DATACENTER_BLOCKED: {
		message:
			"Requests from datacenter IP addresses are not allowed for this site",
		status: 400,
		public: true,
	},
	DISALLOWED_WEBVIEW: {
		message:
			"Requests from in-app browsers (WebViews) are not allowed for this site",
		status: 400,
		public: true,
	},
	MOBILE_BLOCKED: {
		message:
			"Requests from mobile network connections are not allowed for this site",
		status: 400,
		public: true,
	},
	PROXY_BLOCKED: {
		message: "Requests from proxy servers are not allowed for this site",
		status: 400,
		public: true,
	},
	SATELLITE_BLOCKED: {
		message:
			"Requests from satellite connections are not allowed for this site",
		status: 400,
		public: true,
	},
	TOR_BLOCKED: {
		message: "Requests from Tor exit nodes are not allowed for this site",
		status: 400,
		public: true,
	},
	VPN_BLOCKED: {
		message: "Requests from VPN connections are not allowed for this site",
		status: 400,
		public: true,
	},
	TOO_MANY_LOCALHOST: {
		message: "Too many CAPTCHA requests from localhost for this site key",
		status: 400,
		public: true,
	},
	SPAM_EMAIL_DOMAIN: {
		message: "Email domain not allowed",
		status: 400,
		public: true,
	},
	SPAM_EMAIL_RULE: {
		message: "Email address blocked by spam filter rules",
		status: 400,
		public: true,
	},
	SPAM_EMAIL_COUNT_EXCEEDED: {
		message: "Too many submissions from this email address",
		status: 400,
		public: true,
	},
	PROVIDER_VERIFY_FAILED: {
		message: "Provider verification failed",
		status: 400,
		public: true,
	},
	WALLET_NOT_FOUND: { message: "No extension found", public: true },
	SITE_KEY_MISSING: { message: "SITE KEY missing", public: true },
	INSECURE_CONTEXT: {
		message: "Procaptcha requires a secure (HTTPS) connection",
		public: true,
	},

	INVALID_URL: { message: "Invalid URL", status: 400, public: true },
	INVALID_TIER_REQUEST_QUOTA: {
		message: "No plan matches the requested tier",
		status: 400,
		public: true,
	},
	EMAIL_SEND_FAILED: { message: "Failed to send email", public: true },
	USER_NOT_FOUND: { message: "User not found", status: 404, public: true },
	ACCOUNT_NOT_FOUND: {
		message: "Account not found",
		status: 404,
		public: true,
	},
	SITE_NOT_FOUND: { message: "Site not found", status: 404, public: true },
	FEATURE_NOT_ENABLED: {
		message: "Feature not enabled",
		status: 403,
		public: true,
	},
	CAPTCHA_TYPE_SWITCHED_OFF: {
		message: "Captcha type switched off",
		status: 403,
		public: true,
	},
	INVALID_DOMAIN: { message: "Invalid domain", status: 400, public: true },
	DOMAIN_LIMIT_REACHED: {
		message: "Domain limit reached",
		status: 400,
		public: true,
	},
	CANNOT_DEACTIVATE_LAST_SITE: {
		message: "Cannot deactivate the last active site",
		status: 400,
		public: true,
	},
	CANNOT_DELETE_LAST_USER: {
		message: "Cannot delete last user",
		status: 400,
		public: true,
	},
	CANNOT_DELETE_OWN_USER: {
		message: "Cannot delete your own account",
		status: 400,
		public: true,
	},
	CANNOT_MODIFY_OWNER_USER: {
		message: "Cannot modify owner user",
		status: 400,
		public: true,
	},
	CANNOT_MODIFY_USER: {
		message: "Cannot modify user",
		status: 400,
		public: true,
	},
	USER_ALREADY_EXISTS: {
		message: "User already exists",
		status: 400,
		public: true,
	},
	DUPLICATE_SITE_NAME: {
		message: "A site with this name already exists",
		status: 400,
		public: true,
	},
	INVALID_SITE_NAME: {
		message:
			"Site name must contain only letters, numbers, hyphens, and underscores",
		status: 400,
		public: true,
	},
	NO_SUGGESTIONS_FOUND: {
		message: "No suggestions found",
		status: 404,
		public: true,
	},
	API_KEYS_INVALID_NUMBER_OF_SITES: {
		message: "Invalid number of sites for API keys",
		status: 400,
		public: true,
	},
	API_KEYS_NOT_FOUND: {
		message: "API keys not found",
		status: 404,
		public: true,
	},
	PROTECT_GLOBAL_SITE_KEY_IN_USE: {
		message: "Global site key already in use",
		status: 400,
		public: true,
	},
	PROTECT_SETTINGS_CHANGED: {
		message: "Protect settings changed since they were loaded",
		status: 412,
		public: true,
	},
	PAYMENT_METHOD_REQUIRED: {
		message: "Account requires a payment method",
		status: 402,
		public: true,
	},
	PAYMENT_METHOD_TYPE_NOT_ALLOWED: {
		message: "Payment method type not allowed",
		status: 400,
		public: true,
	},
	PAYMENT_FAILED: { message: "Payment failed", status: 404, public: true },
	BILLING_NOT_FOUND: {
		message: "Billing record not found",
		status: 404,
		public: true,
	},
} as const satisfies Record<string, ErrorCodeDefinition>;

export type ErrorCode = keyof typeof ERROR_CODES;

export const isErrorCode = (value: unknown): value is ErrorCode =>
	typeof value === "string" &&
	Object.prototype.hasOwnProperty.call(ERROR_CODES, value);
