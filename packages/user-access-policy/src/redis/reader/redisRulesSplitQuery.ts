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

import {
	AccessPolicyType,
	GLOBAL_CLIENT_SCOPE_SENTINEL,
	type UserScope,
} from "#policy/rule.js";

// Escapes special characters in Redis TAG queries. Mirrors the escape
// function in redisRulesQuery.ts — kept local to avoid coupling the two
// query builders since they'll diverge in shape.
const escapeTagValue = (value: string): string =>
	value.replace(/([,.<>{}\[\]"':;!@#$%^&*()\-+=~|/\\])/g, "\\$1");

// Fields where TAG queries need escaping (they may hold JSON etc.).
const FIELDS_REQUIRING_ESCAPE: ReadonlySet<keyof UserScope> = new Set([
	"coords",
]);

// Fields indexed as NUMERIC — require range syntax `@x:[N N]` not TAG.
const NUMERIC_FIELDS: ReadonlySet<keyof UserScope> = new Set(["asn"]);

// Enumerating the scalar (non-IP) user-scope fields keeps the "no
// user-scope constraint" fall-through query stable when userScopeSchema
// grows a new field — the enumeration below drives ismissing() clauses.
const SCALAR_USER_SCOPE_FIELDS: ReadonlyArray<keyof UserScope> = [
	"userId",
	"ja4Hash",
	"headersHash",
	"userAgentHash",
	"headHash",
	"coords",
	"countryCode",
	"asn",
];

const ALL_USER_SCOPE_FIELDS: ReadonlyArray<keyof UserScope> = [
	...SCALAR_USER_SCOPE_FIELDS,
	"numericIp",
	"numericIpMaskMin",
	"numericIpMaskMax",
];

// Global rules written under the new sentinel are found via
// `@clientId:{global}`; the ismissing() fallback covers legacy rules
// that predate the sentinel stamp (rehash-all migrates them). This
// disjunction still hits the clientId posting list rather than walking
// the full rule set the way the old single-query path did.
const GLOBAL_SCOPE_INNER = `@clientId:{${GLOBAL_CLIENT_SCOPE_SENTINEL}} | ismissing(@clientId)`;

const buildScopeClause = (clientId: string | undefined): string => {
	if (clientId === undefined) {
		return `( ${GLOBAL_SCOPE_INNER} )`;
	}
	return `( @clientId:{${clientId}} | ${GLOBAL_SCOPE_INNER} )`;
};

const buildFieldClause = (
	field: keyof UserScope,
	value: unknown,
): string | null => {
	if (value === undefined) {
		return null;
	}
	const stringValue = String(value);
	if (NUMERIC_FIELDS.has(field)) {
		return `@${field}:[${stringValue} ${stringValue}]`;
	}
	const queryValue = FIELDS_REQUIRING_ESCAPE.has(field)
		? escapeTagValue(stringValue)
		: stringValue;
	return `@${field}:{${queryValue}}`;
};

type SubQuery = {
	// A short label used for logging + metrics. Not part of the query
	// wire format.
	kind: string;
	query: string;
};

/**
 * Build the set of FT sub-queries that together cover every rule that
 * could apply to a request.
 *
 * The single-query design this replaces produced one FT.AGGREGATE whose
 * candidate set was the entire scope's rule pool — the APPLY / SORTBY
 * pipeline then walked every rule per request, which degrades sharply
 * once rule populations reach the 10k+ range. The split approach fires
 * one probe per populated request field. Each probe uses the field's
 * own index posting list, so a 17k IP-ban population collapses to 1
 * result (exact IP) plus a handful (CIDR ranges containing the IP)
 * instead of forcing a full-set scan.
 *
 * A single fall-through probe covers rules with no user-scope constraint
 * (client-wide restriction); those are rare so the ismissing()-heavy
 * query is cheap in practice.
 *
 * Rank + strict-match filtering happens in JS via `rankCandidateRules`
 * after the union — the FT layer is used purely as a candidate fetcher.
 *
 * `blockOnly` narrows the candidate set to rules with `type:{block}` —
 * used by the hard-block middleware which never needs Restrict rules.
 * Every other caller passes false so both Block and Restrict rules are
 * fetched; the JS-side ranker picks the right one via specificity +
 * severity. Merging the block and restrict paths behind one split-query
 * fixed the Twickets IP-rule regression: the previous FT.AGGREGATE ranker
 * used for non-block lookups was truncating specific-IP restrict rules
 * out of the top-N when many higher-specificity irrelevant rules matched
 * the greedy `ismissing()` disjunction.
 */
export const buildScopedRulesSubQueries = (
	userScope: UserScope,
	clientId: string | undefined,
	options: { blockOnly?: boolean } = {},
): SubQuery[] => {
	const typeClause = options.blockOnly
		? `@type:{${AccessPolicyType.Block}} `
		: "";
	const scopeClause = buildScopeClause(clientId);
	const prefix = `${typeClause}${scopeClause}`;

	const subQueries: SubQuery[] = [];

	// One probe per populated scalar user-scope field. Each uses that
	// field's posting list rather than intersecting ismissing() across
	// the full set.
	for (const field of SCALAR_USER_SCOPE_FIELDS) {
		const clause = buildFieldClause(field, userScope[field]);
		if (clause === null) {
			continue;
		}
		subQueries.push({
			kind: `field:${field}`,
			query: `${prefix} ${clause}`,
		});
	}

	// IP: two disjoint probes so each hits a single index. The exact-IP
	// probe catches individual-IP bans (the dominant shape in bulk-ban
	// scripts). The mask-range probe catches CIDR aggregates containing
	// the request IP. Splitting them means neither has to walk a mixed
	// posting list — the mask-range probe was the slower of the two
	// under load, so isolating it lets Redis skip it entirely for hits
	// on the fast path.
	const requestIp = userScope.numericIp;
	if (requestIp !== undefined) {
		subQueries.push({
			kind: "ip:exact",
			query: `${prefix} @numericIp:[${requestIp} ${requestIp}]`,
		});
		subQueries.push({
			kind: "ip:mask",
			query: `${prefix} @numericIpMaskMin:[-inf ${requestIp}] @numericIpMaskMax:[${requestIp} +inf]`,
		});
	}

	// Fall-through: rules that constrain nothing on the user scope
	// ("block everything for this client / everyone"). Rare in
	// practice — a handful per tenant at most — so the ismissing()
	// intersection is cheap despite touching every field.
	const noScopeIsmissing = ALL_USER_SCOPE_FIELDS.map(
		(field) => `ismissing(@${field})`,
	).join(" ");
	subQueries.push({
		kind: "no-user-scope",
		query: `${prefix} ${noScopeIsmissing}`,
	});

	return subQueries;
};

/**
 * Backwards-compatible alias for the previous block-only builder. New
 * callers should use `buildScopedRulesSubQueries` directly.
 *
 * @deprecated use `buildScopedRulesSubQueries(..., { blockOnly: true })`
 */
export const buildScopedBlockSubQueries = (
	userScope: UserScope,
	clientId: string | undefined,
): SubQuery[] =>
	buildScopedRulesSubQueries(userScope, clientId, { blockOnly: true });
