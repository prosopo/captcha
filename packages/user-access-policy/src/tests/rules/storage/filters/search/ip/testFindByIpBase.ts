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
import type { IPAddress } from "@prosopo/types";
import {TestFindRuleBase} from "@tests/rules/storage/filters/search/testFindRuleBase.js";
import type {Ip} from "@rules/rule/ip/ip.js";
import type {Rule} from "@rules/rule/rule.js";
import type {SearchRuleFilters} from "@rules/storage/filters/search/searchRuleFilters.js";

abstract class TestFindByIpBase extends TestFindRuleBase {
	protected abstract getUserIpObject(): Ip;

	protected abstract getUserIpAddress(): IPAddress;

	protected abstract getOtherUserIpAddress(): IPAddress;

	protected abstract getUserIpObjectInOtherVersion(): Ip;

	protected override getClientId(): string | undefined {
		return "client";
	}

	protected override getOtherClientId(): string | undefined {
		return "otherClient";
	}

	protected override getRule(): Rule {
		const clientId = this.getClientId();

		const record: Rule = {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};

		if (null !== clientId) {
			record.clientId = clientId;
		}

		return record;
	}

	protected override getRecordFilters(): SearchRuleFilters {
		return {
			userIpAddress: this.getUserIpAddress(),
		};
	}

	protected override getOtherRecordFilters(): SearchRuleFilters {
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
		await this.rulesStorage.insert({
			...this.getRule(),
			userIp: this.getUserIpObjectInOtherVersion(),
		});

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
			...this.getRecordFilters(),
		});

		// then
		expect(rules.length).toBe(0);
	}
}

export { TestFindByIpBase };
