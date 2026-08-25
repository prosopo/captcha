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
 */
export const HEADER_OPERATORS = [
	"equals",
	"contains",
	"notEquals",
	"notContains",
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
