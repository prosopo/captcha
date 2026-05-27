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
 * Reason persisted at `session.reason` to record why a particular captcha
 * type was chosen for a user (the "selection reason"). Emitted by the
 * frictionless flow in @prosopo/provider; centralised here so the portal,
 * audit tooling, and tests can reference the same values without depending
 * on the server-side provider package.
 */
export enum FrictionlessReason {
	CONTEXT_AWARE_VALIDATION_FAILED = "CONTEXT_AWARE_VALIDATION_FAILED",
	USER_ACCESS_POLICY = "USER_ACCESS_POLICY",
	ACCESS_POLICY_BLOCK = "ACCESS_POLICY_BLOCK",
	USER_AGENT_MISMATCH = "USER_AGENT_MISMATCH",
	OLD_TIMESTAMP = "OLD_TIMESTAMP",
	BOT_SCORE_ABOVE_THRESHOLD = "BOT_SCORE_ABOVE_THRESHOLD",
	WEBVIEW_DETECTED = "WEBVIEW_DETECTED",
	AUTO_BAN_SCORE = "AUTO_BAN_SCORE",
}

/**
 * Reason persisted at `result.reason` to record the outcome of a captcha
 * verification. Provider task code previously inlined these as string
 * literals — the enum lifts the canonical set into one place so callers
 * can type-check what they emit and the portal can render a known list.
 *
 * Values intentionally match the translation keys used to render messages
 * to the user, so the enum doubles as a typed bridge between server-side
 * outcomes and the locale package.
 */
export enum ResultReason {
	CAPTCHA_PASSED = "API.CAPTCHA_PASSED",
	CAPTCHA_FAILED = "API.CAPTCHA_FAILED",
	ABUSER_BLOCKED = "API.ABUSER_BLOCKED",
	ACCESS_POLICY_BLOCK = "API.ACCESS_POLICY_BLOCK",
	CRAWLER_BLOCKED = "API.CRAWLER_BLOCKED",
	DATACENTER_BLOCKED = "API.DATACENTER_BLOCKED",
	FAILED_IP_VALIDATION = "API.FAILED_IP_VALIDATION",
	INCORRECT_CAPTCHA_TYPE = "API.INCORRECT_CAPTCHA_TYPE",
	MOBILE_BLOCKED = "API.MOBILE_BLOCKED",
	PROXY_BLOCKED = "API.PROXY_BLOCKED",
	SATELLITE_BLOCKED = "API.SATELLITE_BLOCKED",
	SPAM_EMAIL_DOMAIN = "API.SPAM_EMAIL_DOMAIN",
	SPAM_EMAIL_RULE = "API.SPAM_EMAIL_RULE",
	TIMESTAMP_TOO_OLD = "API.TIMESTAMP_TOO_OLD",
	TOR_BLOCKED = "API.TOR_BLOCKED",
	VPN_BLOCKED = "API.VPN_BLOCKED",
	CAPTCHA_INVALID_SOLUTION = "CAPTCHA.INVALID_SOLUTION",
	CAPTCHA_INVALID_TIMESTAMP = "CAPTCHA.INVALID_TIMESTAMP",
	CAPTCHA_NO_SESSION_FOUND = "CAPTCHA.NO_SESSION_FOUND",
	CAPTCHA_DECISION_MACHINE_DENIED = "CAPTCHA.DECISION_MACHINE_DENIED",
	USER_NOT_VERIFIED = "API.USER_NOT_VERIFIED",
	USER_VERIFIED = "API.USER_VERIFIED",
	EMAIL_INVALID = "EMAIL_INVALID",
	EMAIL_MATCHED_CUSTOM_PATTERN = "EMAIL_MATCHED_CUSTOM_PATTERN",
	EMAIL_MATCHED_DEFAULT_PATTERN = "EMAIL_MATCHED_DEFAULT_PATTERN",
	EMAIL_TOO_MANY_DOTS = "EMAIL_TOO_MANY_DOTS",
}
