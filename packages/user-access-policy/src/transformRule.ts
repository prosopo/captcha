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

export const transformAccessRuleRecordIntoRule = (
	ruleRecord: AccessRuleRecord,
): AccessRule =>
	// accessRuleInput does all the record field transformations
	accessRuleInput.parse(ruleRecord);

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
			record.ip = Address4.fromInteger(Number(numericIp)).address;
		}

		if (
			"bigint" === typeof numericIpMaskMin &&
			"bigint" === typeof numericIpMaskMax
		) {
			// fixme
			const networkSize =
				Number(numericIpMaskMax) - Number(numericIpMaskMin) + 1;
			const prefixLength = 32 - Math.round(Math.log2(networkSize));
			const networkAddress = Address4.fromInteger(Number(numericIpMaskMin));

			record.ipMask = `${networkAddress.address}/${prefixLength}`;
		}

		return record;
	});

export const transformAccessRuleIntoRecord = (
	rule: AccessRule,
): AccessRuleRecord => accessRuleToRecordScheme.parse(rule);
