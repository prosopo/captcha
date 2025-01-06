import type {
	RuleFilters,
	UserAccessRule,
	UserIp,
} from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { expect } from "vitest";
import { FindRuleByFilterTestsBase } from "../findRuleByFilterTestsBase.js";

abstract class FindRuleByUserIpTests extends FindRuleByFilterTestsBase {
	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getOtherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInOtherVersion(): UserIp;

	protected override getClientId(): string | null {
		return "client";
	}

	protected override getOtherClientId(): string | null {
		return "otherClient";
	}

	protected override getRule(): UserAccessRule {
		const clientId = this.getClientId();

		const record: UserAccessRule = {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};

		if (null !== clientId) {
			record.clientId = clientId;
		}

		return record;
	}

	protected override getRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getUserIpAddress(),
		};
	}

	protected override getOtherRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getOtherUserIpAddress(),
		};
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return super.getTests().concat([
			{
				name: "ignoresRecordWithSameIpInDifferentVersion",
				method: async () => this.ignoresRecordWithSameIpInDifferentVersion(),
			},
		]);
	}

	protected async ignoresRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			...this.getRule(),
			userIp: this.getUserIpObjectInOtherVersion(),
		});

		// when
		const rules = await this.userAccessRulesStorage.find(
			this.getClientId(),
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindRuleByUserIpTests };
