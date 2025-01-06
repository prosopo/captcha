import type { UserIp } from "@prosopo/types-database";
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
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";

abstract class IpUniqueIndexTests extends UserAccessRuleTestsBase {
	protected abstract getFirstUserIpObject(): UserIp;

	protected abstract getSecondUserIpObject(): UserIp;

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "globalRuleAcceptsUniqueIp",
				method: async () => this.globalRuleAcceptsUniqueIp(),
			},
			{
				name: "globalRuleRejectsNotUniqueIp",
				method: async () => this.globalRuleRejectsNotUniqueIp(),
			},
			{
				name: "clientRuleAcceptsUniqueIp",
				method: async () => this.clientRuleAcceptsUniqueIp(),
			},
			{
				name: "clientRuleRejectsNotUniqueIp",
				method: async () => this.clientRuleRejectsNotUniqueIp(),
			},
			{
				name: "globalAndClientRulesCanHaveSameIp",
				method: async () => this.globalAndClientRulesCanHaveSameIp(),
			},
		];
	}

	protected async globalRuleAcceptsUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async globalRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async clientRuleAcceptsUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
			clientId: "client",
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async clientRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
				clientId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async globalAndClientRulesCanHaveSameIp(): Promise<void> {
		// given
		const userRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// then
		expect(userRecord).not.toBeNull();
		expect(globalRecord).not.toBeNull();
	}
}

export { IpUniqueIndexTests };
