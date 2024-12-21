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
import { ProsopoEnvError } from "@prosopo/common";
import {
	CaptchaMerkleTree,
	computeCaptchaSolutionHash,
} from "@prosopo/datasets";
import type { CaptchaSolution } from "@prosopo/types";
import {
	BlockRuleType,
	type IPAddressBlockRule,
	type IProviderDatabase,
	type UserAccountBlockRule,
	type UserAccountBlockRuleRecord,
} from "@prosopo/types-database";
import { Address4 } from "ip-address";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkIpRules } from "../../../../rules/ip.js";
import { checkUserRules } from "../../../../rules/user.js";
import {
	buildTreeAndGetCommitmentId,
	getCaptchaConfig,
} from "../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js";

vi.mock("@prosopo/datasets", () => ({
	CaptchaMerkleTree: vi.fn().mockImplementation(() => ({
		build: vi.fn(),
		root: { hash: "mockedRootHash" },
	})),
	computeCaptchaSolutionHash: vi.fn(),
}));

vi.mock("../../../../rules/ip.js", () => {
	return {
		checkIpRules: vi.fn(),
	};
});

vi.mock("../../../../rules/user.js", () => {
	return {
		checkUserRules: vi.fn(),
	};
});

describe("buildTreeAndGetCommitmentId", () => {
	const mockCaptchaSolutions = [
		{ challenge: "challenge1", solution: "solution1", salt: "salt1" },
		{ challenge: "challenge2", solution: "solution2", salt: "salt2" },
	] as unknown as CaptchaSolution[];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should build a tree and return the commitmentId", () => {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(computeCaptchaSolutionHash as any)
			.mockReturnValueOnce("hashedSolution1")
			.mockReturnValueOnce("hashedSolution2");

		const result = buildTreeAndGetCommitmentId(mockCaptchaSolutions);

		expect(CaptchaMerkleTree).toHaveBeenCalled();
		expect(computeCaptchaSolutionHash).toHaveBeenCalledWith(
			mockCaptchaSolutions[0],
		);
		expect(computeCaptchaSolutionHash).toHaveBeenCalledWith(
			mockCaptchaSolutions[1],
		);
		expect(result).toEqual({
			tree: expect.any(Object),
			commitmentId: "mockedRootHash",
		});
	});

	it("should throw an error if commitmentId does not exist", () => {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(CaptchaMerkleTree as any).mockImplementation(() => ({
			build: vi.fn(),
			root: { hash: null },
		}));

		expect(() => buildTreeAndGetCommitmentId(mockCaptchaSolutions)).toThrow(
			new ProsopoEnvError(
				"CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST",
				{
					context: {
						failedFuncName: "buildTreeAndGetCommitmentId",
						commitmentId: null,
					},
				},
			),
		);
	});
});

describe("getCaptchaConfig", () => {
	it("should return the default captcha config if no rules are found", async () => {
		const db = {
			getIPBlockRuleRecord: vi.fn().mockResolvedValue(null),
			getUserBlockRuleRecord: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const config = {
			captchas: {
				solved: { count: 1 },
				unsolved: { count: 2 },
			},
		};
		const ipAddress = new Address4("1.1.1.1");
		const user = "mockedUser";
		const dapp = "mockedDapp";

		// @ts-ignore
		const result = await getCaptchaConfig(db, config, ipAddress, user, dapp);

		expect(result).toEqual({
			solved: { count: 1 },
			unsolved: { count: 2 },
		});
	});
	it("should return the users config if there is one specified against the user's ip address", async () => {
		const ipRule: IPAddressBlockRule = {
			ip: 16843009, // 1.1.1.1
			global: false,
			hardBlock: false,
			type: BlockRuleType.ipAddress,
			captchaConfig: {
				solved: { count: 3 },
				unsolved: { count: 4 },
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: tests
		(checkIpRules as any).mockReturnValue(ipRule);
		const db = {
			getIPBlockRuleRecord: vi.fn().mockResolvedValue(ipRule),
			getUserBlockRuleRecord: vi.fn().mockResolvedValue(null),
		} as unknown as IProviderDatabase;
		const config = {
			captchas: {
				solved: { count: 1 },
				unsolved: { count: 2 },
			},
		};
		const ipAddress = new Address4("1.1.1.1"); // 16843009
		const user = "mockedUser";
		const dapp = "mockedDapp";
		// @ts-ignore
		const result = await getCaptchaConfig(db, config, ipAddress, user, dapp);
		expect(result).toEqual({
			solved: { count: 3 },
			unsolved: { count: 4 },
		});
	});
	it("should return the user's config if there is one specified against the user's account", async () => {
		const userRule: UserAccountBlockRule = {
			userAccount: "mockedUser",
			dappAccount: "mockedDapp",
			global: false,
			hardBlock: false,
			type: BlockRuleType.userAccount,
			captchaConfig: {
				solved: { count: 5 },
				unsolved: { count: 6 },
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: tests
		(checkIpRules as any).mockReturnValue(null);
		const db = {
			getIPBlockRuleRecord: vi.fn().mockResolvedValue(null),
			getUserBlockRuleRecord: vi.fn().mockResolvedValue(userRule),
		} as unknown as IProviderDatabase;
		// biome-ignore lint/suspicious/noExplicitAny: tests
		(checkUserRules as any).mockReturnValue(userRule);
		const config = {
			captchas: {
				solved: { count: 1 },
				unsolved: { count: 2 },
			},
		};
		const ipAddress = new Address4("1.1.1.1");
		const user = "mockedUser";
		const dapp = "mockedDapp";
		// @ts-ignore
		const result = await getCaptchaConfig(db, config, ipAddress, user, dapp);
		expect(result).toEqual({
			solved: { count: 5 },
			unsolved: { count: 6 },
		});
	});
});
