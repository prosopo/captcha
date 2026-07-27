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
import { ProsopoEnvError } from "@prosopo/common";
import {
	CaptchaMerkleTree,
	computeCaptchaSolutionHash,
} from "@prosopo/datasets";
import type { CaptchaSolution } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTreeAndGetCommitmentId } from "../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js";

vi.mock("@prosopo/datasets", () => ({
	// The code under test does `new CaptchaMerkleTree()`. vitest 4 requires the
	// implementation to be constructible, so this is a class rather than the
	// arrow that worked under vitest 3.
	CaptchaMerkleTree: vi.fn().mockImplementation(
		class CaptchaMerkleTreeMock {
			root: { hash: string } | null = null; // set by build()
			build = vi.fn(() => {
				this.root = { hash: "mockedRootHash" };
			});
			getRoot = vi.fn().mockReturnValue({ hash: "mockedRootHash" });
		},
	),
	computeCaptchaSolutionHash: vi.fn(),
}));

describe("buildTreeAndGetCommitmentId", () => {
	const mockCaptchaSolutions = [
		{ challenge: "challenge1", solution: "solution1", salt: "salt1" },
		{ challenge: "challenge2", solution: "solution2", salt: "salt2" },
	] as unknown as CaptchaSolution[];

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the mock implementation to the default state to ensure test isolation
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(CaptchaMerkleTree as any).mockImplementation(function () {
			return {
				build: vi.fn(),
				root: { hash: "mockedRootHash" },
			};
		});
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
		// Override the mock for this specific test
		const originalMock = vi.mocked(CaptchaMerkleTree);
		vi.mocked(CaptchaMerkleTree).mockImplementationOnce(
			() =>
				({
					build: vi.fn(),
					root: { hash: null },
					getRoot: vi.fn().mockReturnValue({ hash: null }),
					// biome-ignore lint/suspicious/noExplicitAny: tests
				}) as any,
		);

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

		// Restore the original mock
		vi.mocked(CaptchaMerkleTree).mockImplementation(
			// biome-ignore lint/style/noNonNullAssertion: tests
			originalMock.getMockImplementation()!,
		);
	});
});
