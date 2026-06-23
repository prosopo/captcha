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

import * as util from "node:util";
import { chunkIntoBatches, executeBatchesSequentially } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { RedisClientType } from "redis";
import {
	REDIS_QUERY_DIALECT,
	getRulesRedisQuery,
} from "#policy/redis/reader/redisRulesQuery.js";
import {
	REDIS_BATCH_SIZE,
	fetchRedisHashRecords,
	getMissingRedisKeys,
	parseRedisRecords,
} from "#policy/redis/redisClient.js";
import {
	ACCESS_RULES_REDIS_INDEX_NAME,
	ACCESS_RULE_REDIS_KEY_PREFIX,
} from "#policy/redis/redisRuleIndex.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import type {
	AccessRuleEntry,
	AccessRulesFilter,
	AccessRulesReader,
} from "#policy/rulesStorage.js";
import { aggregateRedisKeys } from "./redisAggregate.js";

// Server-side specificity ranking config.
//
// Strict-match findRules (matchingFieldsOnly=true) used to pull every
// matching rule's hash into Node and sort in JS. With the greedy regression
// in #2689 this hauled ~1190 hashes per request and pegged provider CPU.
//
// The new path lets RediSearch compute specificity itself: one
// FT.AGGREGATE that filters via the strict AND-of-disjunctions query,
// counts populated rule fields with APPLY+exists(), sorts by that
// derived score DESC, and returns only the top-N candidates. Node
// receives at most TOP_N small records, no HGETALL fanout, no JS rank.
//
// TOP_N >> 1 leaves headroom for the deferToVerify filter that runs
// post-aggregate (a Block rule with deferToVerify is skipped in the
// blockMiddleware path, so we need a few alternates ready). 20 covers
// the worst observed concentration of deferToVerify rules per scope by
// comfortable margin while keeping payload tiny.
export const SERVER_SIDE_RANK_TOP_N = 20;

// Safety cap for the greedy (admin/internal) path. Generous because
// admin tooling depends on the full result set; not on the hot
// per-request path.
const GREEDY_MAX_CANDIDATES = REDIS_BATCH_SIZE * 10;

// Fields that contribute one specificity point each. Mirrors
// SCALAR_USER_SCOPE_FIELDS + clientId + ip-constraint in
// blacklistRequestInspector.ruleSpecificity. numericIp and the
// numericIpMaskMin range are mutually exclusive on a rule (see
// ruleHasIpConstraint), so `exists(@numericIp) + exists(@numericIpMaskMin)`
// contributes 1 in practice — never 2 — when applied to writer-produced
// rules.
const SPECIFICITY_EXPR = [
	"exists(@clientId)",
	"exists(@userId)",
	"exists(@ja4Hash)",
	"exists(@headersHash)",
	"exists(@userAgentHash)",
	"exists(@headHash)",
	"exists(@coords)",
	"exists(@countryCode)",
	"exists(@asn)",
	"exists(@numericIp)",
	"exists(@numericIpMaskMin)",
].join(" + ");

// Block outranks Restrict on equal specificity (defensive: a request
// that would match a Block rule must never be downgraded). Note the
// string literal is lowercase because AccessPolicyType.Block = "block"
// and getRedisRuleValue serialises via String().
const SEVERITY_EXPR = `(@type == "${AccessPolicyType.Block}")`;

// Final rank: specificity weighted, severity as tiebreaker on equal
// specificity. spec*2 + sev fits both into a single sortable float.
const RANK_EXPR = "(@_spec * 2) + @_sev";

// Every field referenced by SPECIFICITY_EXPR/SEVERITY_EXPR, plus the
// fields needed to reconstruct an AccessRule downstream. APPLY can only
// see fields explicitly loaded into the aggregate pipeline, so this
// list must include every rule attribute the parser cares about.
const RULE_LOAD_FIELDS = [
	"@__key",
	"@type",
	"@captchaType",
	"@description",
	"@solvedImagesCount",
	"@imageThreshold",
	"@powDifficulty",
	"@unsolvedImagesCount",
	"@frictionlessScore",
	"@deferToVerify",
	"@clientId",
	"@groupId",
	"@userId",
	"@ja4Hash",
	"@headersHash",
	"@userAgentHash",
	"@headHash",
	"@coords",
	"@countryCode",
	"@asn",
	"@numericIp",
	"@numericIpMaskMin",
	"@numericIpMaskMax",
] as const;

export class RedisRulesReader implements AccessRulesReader {
	constructor(
		private readonly client: RedisClientType,
		private readonly logger: Logger,
	) {}

	async getMissingRuleIds(ruleIds: string[]): Promise<string[]> {
		const ruleKeys = this.getRuleKeys(ruleIds);
		const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

		const missingKeyBatches = await executeBatchesSequentially(
			keyBatches,
			async (keysBatch) => getMissingRedisKeys(this.client, keysBatch),
		);

		return missingKeyBatches
			.flat()
			.map((ruleKey) => ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length));
	}

	async fetchRules(ruleIds: string[]): Promise<AccessRuleEntry[]> {
		const ruleKeys = this.getRuleKeys(ruleIds);

		const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

		const entryBatches = await executeBatchesSequentially(
			keyBatches,
			(keysBatch) => this.fetchRuleEntries(keysBatch),
		);

		return entryBatches.flat();
	}

	async findRules(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
		skipEmptyUserScopes = true,
	): Promise<AccessRule[]> {
		const query = getRulesRedisQuery(filter, matchingFieldsOnly);

		if (skipEmptyUserScopes && query === "ismissing(@clientId)") {
			// We don't want to accidentally return all rules when the filter is empty
			return [];
		}

		// Hot path: strict-match callers (blockMiddleware /
		// checkForHardBlock) get server-side specificity ranking via
		// FT.AGGREGATE — Redis returns the top N candidates already
		// sorted, no HGETALL fanout. See SPECIFICITY_EXPR / RANK_EXPR
		// above for the score definition.
		if (matchingFieldsOnly) {
			return this.findRulesRanked(filter, query);
		}

		// Admin / internal callers (greedy mode): keep the FT.SEARCH +
		// HGETALL fanout path. Cap at REDIS_BATCH_SIZE; truncation past
		// that point is the known liability tracked in #2689.
		return this.findRulesGreedy(filter, query);
	}

	private async findRulesRanked(
		filter: AccessRulesFilter,
		query: string,
	): Promise<AccessRule[]> {
		try {
			const reply = await this.client.ft.aggregate(
				ACCESS_RULES_REDIS_INDEX_NAME,
				query,
				{
					DIALECT: REDIS_QUERY_DIALECT,
					LOAD: [...RULE_LOAD_FIELDS],
					STEPS: [
						// Drop candidates whose hash is missing `type` before
						// any APPLY runs. SEVERITY_EXPR dereferences `@type`
						// directly, and RediSearch throws
						//   "Could not find the value for a parameter name,
						//    consider using EXISTS if applicable for type"
						// when the LOAD pulls an undefined @type, aborting
						// the whole aggregate. The undefined @type can come
						// from a partial-write race in the writer or a
						// stale RediSearch index entry pointing at a hash
						// whose `type` field has been removed; in both
						// cases the doc is malformed and not a valid
						// AccessRule, so dropping it is correct.
						{ type: "FILTER", expression: "exists(@type)" },
						{ type: "APPLY", expression: SPECIFICITY_EXPR, AS: "_spec" },
						{ type: "APPLY", expression: SEVERITY_EXPR, AS: "_sev" },
						{ type: "APPLY", expression: RANK_EXPR, AS: "_rank" },
						{
							type: "SORTBY",
							BY: [{ BY: "@_rank", DIRECTION: "DESC" }],
							// SORTBY MAX would let RediSearch keep only the
							// top-N in a bounded heap rather than fully
							// sorting, but the @redis/search client
							// serialises MAX *before* DESC and RediSearch
							// rejects that order ("MISSING ASC or DESC
							// after sort field (MAX)"). LIMIT below still
							// trims; SORTBY does a full sort. Acceptable
							// because the strict-match filter already
							// keeps the candidate set small in practice.
						},
						{ type: "LIMIT", from: 0, size: SERVER_SIDE_RANK_TOP_N },
					],
				},
			);

			if (reply.results.length === 0) {
				return [];
			}

			this.logger.debug(() => ({
				msg: "Executed ranked search query",
				data: {
					inspect: util.inspect(
						{
							filter: filter,
							foundCount: reply.results.length,
							query: query,
						},
						{ depth: null },
					),
				},
			}));

			// FT.AGGREGATE LOAD reads NUMERIC fields from the index (an
			// 8-byte double), not from the underlying hash, so any
			// numericIp/numericIpMaskMin/numericIpMaskMax larger than
			// Number.MAX_SAFE_INTEGER (e.g. every IPv6 rule) round-trips
			// as scientific notation — `5.59112965392e+37` — and
			// `z.coerce.bigint()` throws
			//   "Cannot convert 5.59112965392e+37 to a BigInt"
			// which aborts the whole aggregate via the catch below and
			// returns no rules. The hash itself stores the full
			// 38-digit string verbatim, so the aggregate is used purely
			// as a ranker (it gives us the top-N keys, sorted by spec /
			// severity); the real field values come back via HGETALL
			// over those keys, identical to the greedy path. Same
			// race-safety as the greedy path: HGETALL on a key that's
			// been deleted between FT.AGGREGATE and HGETALL returns an
			// empty hash, which is dropped by the non-empty filter.
			const ruleKeys: string[] = [];
			for (const result of reply.results) {
				const key = (result as { __key?: unknown }).__key;
				if (typeof key === "string") {
					ruleKeys.push(key);
				}
			}

			if (ruleKeys.length === 0) {
				return [];
			}

			const { records } = await fetchRedisHashRecords(
				this.client,
				ruleKeys,
				this.logger,
			);

			const nonEmptyRecords = records.filter(
				(record) => Object.keys(record).length > 0,
			);

			return parseRedisRecords(nonEmptyRecords, accessRuleInput, this.logger);
		} catch (e) {
			this.logger.error(() => ({
				err: e,
				data: {
					inspect: util.inspect({ query, filter }, { depth: null }),
				},
				msg: "failed to execute ranked search query",
			}));

			return [];
		}
	}

	// Used only by admin / internal callers (matchingFieldsOnly=false).
	// Not on the per-request blockMiddleware path any more, so the CPU
	// cost of the HGETALL fanout is acceptable. Same shape as #2689's
	// aggregate-with-cursor: returns every candidate up to
	// GREEDY_MAX_CANDIDATES so we don't silently drop matches that
	// admin tools depend on (e.g. ASN-wide rule listings).
	private async findRulesGreedy(
		filter: AccessRulesFilter,
		query: string,
	): Promise<AccessRule[]> {
		try {
			const ruleKeys = await aggregateRedisKeys(
				this.client,
				query,
				this.logger,
				undefined,
				GREEDY_MAX_CANDIDATES,
			);

			if (ruleKeys.length === 0) {
				return [];
			}

			this.logger.debug(() => ({
				msg: "Executed greedy search query",
				data: {
					inspect: util.inspect(
						{
							filter: filter,
							foundCount: ruleKeys.length,
							query: query,
						},
						{ depth: null },
					),
				},
			}));

			const { records } = await fetchRedisHashRecords(
				this.client,
				ruleKeys,
				this.logger,
			);

			const nonEmptyRecords = records.filter(
				(record) => Object.keys(record).length > 0,
			);

			return parseRedisRecords(nonEmptyRecords, accessRuleInput, this.logger);
		} catch (e) {
			this.logger.error(() => ({
				err: e,
				data: {
					inspect: util.inspect({ query, filter }, { depth: null }),
				},
				msg: "failed to execute greedy search query",
			}));

			return [];
		}
	}

	async findRuleIds(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
	): Promise<string[]> {
		const query = getRulesRedisQuery(filter, matchingFieldsOnly);

		let ruleIds: string[] = [];

		try {
			// aggregation is used instead ft.search to overcome the limitation on search results number
			const ruleKeys = await aggregateRedisKeys(
				this.client,
				query,
				this.logger,
			);

			ruleIds = ruleKeys.map((ruleKey) =>
				ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
			);
		} catch (e) {
			this.logger.error(() => ({
				err: e,
				data: {
					inspect: util.inspect(
						{
							query: query,
							filter: filter,
						},
						{
							depth: null,
						},
					),
				},
				msg: "Failed to execute search query for rule IDs",
			}));

			return [];
		}

		this.logger.debug(() => ({
			msg: "Executed search query for rule IDs",
			data: {
				query: query,
				foundCount: ruleIds.length,
				foundIds: ruleIds,
			},
		}));

		return ruleIds;
	}

	async fetchAllRuleIds(
		batchHandler: (ruleIds: string[]) => Promise<void>,
	): Promise<void> {
		const keysBatchHandler = async (keys: string[]) => {
			const ids = keys.map((ruleKey) =>
				ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
			);

			await batchHandler(ids);
		};

		await aggregateRedisKeys(this.client, "*", this.logger, keysBatchHandler);
	}

	protected async fetchRuleEntries(keys: string[]): Promise<AccessRuleEntry[]> {
		const { records, expirations } = await fetchRedisHashRecords(
			this.client,
			keys,
			this.logger,
		);
		const entries: AccessRuleEntry[] = [];

		for (const [index, ruleData] of records.entries()) {
			const isRulePresent = Object.keys(ruleData).length > 0;

			if (isRulePresent) {
				const rule = parseRedisRecords(
					[ruleData],
					accessRuleInput,
					this.logger,
				)[0];

				if (rule) {
					entries.push({
						rule: rule,
						expiresUnixTimestamp: expirations[index],
					});
				}
			}
		}

		return entries;
	}

	protected getRuleKeys(ruleIds: string[]): string[] {
		return ruleIds.map((id) => `${ACCESS_RULE_REDIS_KEY_PREFIX}${id}`);
	}
}

export class DummyRedisRulesReader implements AccessRulesReader {
	constructor(private readonly logger: Logger) {}

	async getMissingRuleIds(ruleIds: string[]): Promise<string[]> {
		this.logger.info(() => ({
			msg: "Dummy getMissingRuleIds() has no effect (redis is not ready)",
			data: {
				ruleIds,
			},
		}));

		return [];
	}

	async fetchRules(ruleIds: string[]): Promise<AccessRuleEntry[]> {
		this.logger.info(() => ({
			msg: "Dummy fetchRule() has no effect (redis is not ready)",
			data: {
				ruleIds,
			},
		}));

		return [];
	}

	async findRules(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
		skipEmptyUserScopes = true,
	): Promise<AccessRule[]> {
		this.logger.info(() => ({
			msg: "Dummy findRules() has no effect (redis is not ready)",
			data: {
				filter,
			},
		}));

		return [];
	}

	async findRuleIds(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
	): Promise<string[]> {
		this.logger.info(() => ({
			msg: "Dummy findRuleIds() has no effect (redis is not ready)",
			data: {
				filter,
			},
		}));

		return [];
	}

	async fetchAllRuleIds(
		batchHandler: (ruleIds: string[]) => Promise<void>,
	): Promise<void> {
		this.logger.info(() => ({
			msg: "Dummy fetchAllRuleIds() has no effect (redis is not ready)",
		}));
	}
}
