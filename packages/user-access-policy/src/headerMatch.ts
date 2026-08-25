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
 * Operators for an access rule's arbitrary-header condition.
 *
 * `equals` / `contains` are the deny-list operators (block when the request's
 * header matches). `notEquals` / `notContains` are their allow-list negations
 * (block when the request's header does NOT match — including when the header
 * is absent), so an allow-list card that says "only let requests with header X
 * through" desugars to `notEquals` / `notContains` Block rules, exactly the way
 * the OS allow-list desugars to Block rules on the complement.
 *
 * `notEqualsAny` / `notContainsAny` are the multi-value form of those two: the
 * rule's `headerValue` holds a list (see `encodeHeaderValueList`) and the rule
 * blocks unless the request's header matches *one of* the listed values. They
 * exist because an allow-list over several values of the SAME header cannot be
 * expressed as several single-value rules — each rule fires independently, so
 * `notEquals ios` + `notEquals android` blocks both an iOS and an Android
 * request. One rule holding both values is the only way to get the "any of"
 * semantics the allow-list needs.
 */
export const HEADER_OPERATORS = [
	"equals",
	"contains",
	"notEquals",
	"notContains",
	"notEqualsAny",
	"notContainsAny",
] as const;

export type HeaderOperator = (typeof HEADER_OPERATORS)[number];

export const isHeaderOperator = (
	value: string | undefined,
): value is HeaderOperator =>
	value !== undefined &&
	(HEADER_OPERATORS as ReadonlyArray<string>).includes(value);

/**
 * Sentinel value carried both on every request's user scope (see
 * `getRequestUserScope`) and on every header-restriction rule. Header rules
 * match on data (`headerName` / `headerValue` / `headerOperator`) that Redis
 * cannot evaluate — substring `contains` and per-rule operators aren't
 * expressible as a TAG query, and an allow-list rule must still fire on a
 * request that OMITS the target header, so candidate selection can't key off
 * header presence. The marker makes every header rule an unconditional
 * candidate for every request; the concrete condition is then checked in code
 * by `accessRuleHeaderMatches`.
 */
export const HEADER_RULE_MARKER = "1";

/**
 * Encode the value list carried by a multi-value operator (`notEqualsAny` /
 * `notContainsAny`) into the single `headerValue` string an access rule can
 * store. JSON rather than a delimiter because header values are arbitrary
 * text — any separator we picked could legitimately occur inside a value.
 */
export const encodeHeaderValueList = (values: ReadonlyArray<string>): string =>
	JSON.stringify(values);

/**
 * Inverse of {@link encodeHeaderValueList}, tolerant of rules written by hand
 * (e.g. via the access-policy CLI) that carry a single literal value instead of
 * an encoded list.
 *
 * Returns `undefined` for a value that looks list-encoded but isn't usable — an
 * empty list, a non-array, non-string members, or malformed JSON. Callers treat
 * that as a malformed rule and decline to fire it, so a garbled list can't
 * silently block all traffic.
 */
export const decodeHeaderValueList = (value: string): string[] | undefined => {
	if (!value.trimStart().startsWith("[")) {
		// Not list-encoded: treat the whole string as a one-value list.
		return [value];
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}
	if (
		!Array.isArray(parsed) ||
		parsed.length === 0 ||
		!parsed.every((entry): entry is string => typeof entry === "string")
	) {
		return undefined;
	}
	return parsed;
};

/**
 * Evaluate a single header condition against a request's headers. Returns
 * `true` when the condition is satisfied — i.e. when a Block rule carrying it
 * should fire for this request.
 *
 * `headers` is expected to be keyed by lower-cased header name (HTTP header
 * names are case-insensitive); `headerName` is lower-cased here defensively.
 * The negated operators treat an absent header as "not matching the value",
 * which is what makes an allow-list block a request that drops the header.
 */
export const evaluateHeaderCondition = (
	headerName: string,
	operator: HeaderOperator,
	value: string,
	headers: Record<string, string>,
): boolean => {
	const actual = headers[headerName.toLowerCase()];
	switch (operator) {
		case "equals":
			return actual !== undefined && actual === value;
		case "contains":
			return actual?.includes(value) ?? false;
		case "notEquals":
			return actual === undefined || actual !== value;
		case "notContains":
			return actual === undefined || !actual.includes(value);
		case "notEqualsAny": {
			const values = decodeHeaderValueList(value);
			if (values === undefined) {
				return false;
			}
			return actual === undefined || !values.includes(actual);
		}
		case "notContainsAny": {
			const values = decodeHeaderValueList(value);
			if (values === undefined) {
				return false;
			}
			return (
				actual === undefined ||
				!values.some((candidate) => actual.includes(candidate))
			);
		}
	}
};

/**
 * Whether a rule's header condition (if any) is satisfied by the request's
 * headers. A rule with no `headerName` carries no header constraint, so it is
 * treated as satisfied and the rule's other dimensions decide the match. A
 * rule with a `headerName` but an unrecognised operator is malformed and never
 * matches (fail-safe: a garbled rule must not silently block traffic).
 */
export const accessRuleHeaderMatches = (
	rule: {
		headerName?: string;
		headerValue?: string;
		headerOperator?: string;
	},
	headers: Record<string, string>,
): boolean => {
	if (rule.headerName === undefined) {
		return true;
	}
	if (!isHeaderOperator(rule.headerOperator)) {
		return false;
	}
	return evaluateHeaderCondition(
		rule.headerName,
		rule.headerOperator,
		rule.headerValue ?? "",
		headers,
	);
};
