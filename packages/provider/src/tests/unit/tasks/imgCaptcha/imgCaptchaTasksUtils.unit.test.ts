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
import type { CaptchaSolution } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { buildTreeAndGetCommitmentId } from "../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js";

// Realistic captcha solutions — the native module hashes captchaId +
// captchaContentId + sorted(solution) + salt with blake2b-256, so the test
// only cares about determinism and the presence/absence of a root, not
// about specific hash values.
const mockCaptchaSolutions: CaptchaSolution[] = [
	{
		captchaId: "captchaId1",
		captchaContentId: "captchaContentId1",
		salt: "salt1",
		solution: ["a", "b"],
	},
	{
		captchaId: "captchaId2",
		captchaContentId: "captchaContentId2",
		salt: "salt2",
		solution: ["c", "d"],
	},
];

describe("buildTreeAndGetCommitmentId", () => {
	it("builds a tree and returns a commitmentId that is deterministic across calls", () => {
		const first = buildTreeAndGetCommitmentId(mockCaptchaSolutions);
		const second = buildTreeAndGetCommitmentId(mockCaptchaSolutions);

		expect(first.commitmentId).toMatch(/^0x[0-9a-f]{64}$/);
		expect(first.commitmentId).toBe(second.commitmentId);
		expect(first.tree.root?.hash).toBe(first.commitmentId);
		expect(first.tree.leaves.length).toBe(mockCaptchaSolutions.length);
	});

	it("still returns a valid commitmentId when there is only one solution (single-leaf tree)", () => {
		const single = mockCaptchaSolutions.slice(0, 1);
		const { commitmentId, tree } = buildTreeAndGetCommitmentId(single);

		expect(commitmentId).toMatch(/^0x[0-9a-f]{64}$/);
		// Single-leaf tree: root hash equals the leaf hash.
		expect(tree.root?.hash).toBe(commitmentId);
		expect(tree.leaves.length).toBe(1);
	});

	it("throws CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST when passed no solutions", () => {
		// The native module rejects empty input; the wrapper surfaces the same
		// commitment-missing error the JS impl used to throw.
		expect(() => buildTreeAndGetCommitmentId([])).toThrow(ProsopoEnvError);
	});
});
