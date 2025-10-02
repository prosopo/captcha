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

import crypto from "node:crypto";
import { IpAddress, IpRange } from "cidr-calc";
import { Address4 } from "ip-address";
import { z } from "zod";
import type { AccessRule } from "./rule.js";
import {
	accessPolicyInput,
	policyScopeInput,
} from "./ruleInput/policyInput.js";
import { accessRuleInput } from "./ruleInput/ruleInput.js";
import { userScopeSchema } from "./ruleInput/userScopeInput.js";
import type { AccessRuleRecord } from "./ruleRecord.js";

const RULE_HASH_ALGORITHM = "md5";

export const makeAccessRuleHash = (rule: AccessRule): string => {
	/**
	 * Zod parsing ensures the consistent field order, which affects the hash.
	 * It would be better to sort alphabetically instead,
	 * but we use parsing for back compatibility with existing rule hashes.
	 */
	const orderedRuleProperties = accessRuleInput.parse(rule);

	return hashRule(orderedRuleProperties);
};

export const transformAccessRuleRecordIntoRule = (
	ruleRecord: AccessRuleRecord,
): AccessRule =>
	// accessRuleInput does all the record field transformations
	accessRuleInput.parse(ruleRecord);

export const transformAccessRuleIntoRecord = (
	rule: AccessRule,
): AccessRuleRecord => accessRuleToRecordScheme.parse(rule);

const accessRuleToRecordScheme = z
	.object({
		...accessPolicyInput.shape,
		...policyScopeInput.shape,
		...userScopeSchema.shape,
		groupId: z.coerce.string().optional(),
	})
	.transform((ruleInput: AccessRule): AccessRuleRecord => {
		// extract groupId
		const {
			groupId,
			numericIp,
			numericIpMaskMin,
			numericIpMaskMax,
			userAgentHash,
			...rule
		} = ruleInput;

		const record: AccessRuleRecord = rule;

		if ("string" === typeof groupId) {
			record.ruleGroupId = groupId;
		}

		if ("string" === typeof userAgentHash) {
			record.userAgent = userAgentHash;
		}

		if ("bigint" === typeof numericIp) {
			record.ip = getStringIpFromNumeric(numericIp);
		}

		if (
			"bigint" === typeof numericIpMaskMin &&
			"bigint" === typeof numericIpMaskMax
		) {
			record.ipMask = getCidrFromNumericIpRange(
				numericIpMaskMin,
				numericIpMaskMax,
			);
		}

		return record;
	});

const hashRule = (rule: AccessRule): string =>
	crypto
		.createHash(RULE_HASH_ALGORITHM)
		.update(stringifyRule(rule))
		.digest("hex");

const stringifyRule = (rule: AccessRule): string =>
	JSON.stringify(rule, (key, value) =>
		// JSON.stringify can't handle BigInt itself: throws "Do not know how to serialize a BigInt"
		"bigint" === typeof value ? value.toString() : value,
	);

const getStringIpFromNumeric = (numericIp: bigint): string =>
	Address4.fromInteger(Number(numericIp)).address;

export const getCidrFromNumericIpRange = (
	startIp: bigint,
	endIp: bigint,
): string | undefined => {
	const ipRange = new IpRange(
		IpAddress.of(getStringIpFromNumeric(startIp)),
		IpAddress.of(getStringIpFromNumeric(endIp)),
	);

	const cidr = ipRange.toCidrs()[0];

	return cidr ? `${cidr.prefix.toString()}/${cidr.prefixLen}` : undefined;
};
