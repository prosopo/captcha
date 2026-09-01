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

// Characterisation tests for the two blocking rule shapes as they pass
// through the write-side zod types:
//
//   1. plain Block            — rejects at request time
//   2. Block + deferToVerify  — passes request time, rejects at verify
//
// These pin down what each shape may carry, and what survives the write
// path into storage. Written against the schemas the rule-sync API
// actually validates with, so a change in either direction fails here
// first rather than as a 400 in production.

import type { Logger } from "@prosopo/logger";
import { CaptchaType } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import { InsertRulesEndpoint } from "#policy/api/write/insertRules.js";
import { AccessPolicyType } from "#policy/rule.js";
import {
	accessPolicyInput,
	sanitizeAccessPolicy,
} from "#policy/ruleInput/policyInput.js";
import type { AccessRulesWriter } from "#policy/rulesStorage.js";

const makeMockLogger = (): Logger =>
	({
		trace: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
		setLogLevel: vi.fn(),
		getLogLevel: vi.fn().mockReturnValue("info"),
		with: vi.fn().mockReturnThis(),
		getScope: vi.fn().mockReturnValue("test"),
		getPretty: vi.fn().mockReturnValue(false),
		setPretty: vi.fn(),
		getPrintStack: vi.fn().mockReturnValue(false),
		setPrintStack: vi.fn(),
		getFormat: vi.fn().mockReturnValue("json"),
		setFormat: vi.fn(),
	}) satisfies Logger;

const makeMockWriter = (): AccessRulesWriter =>
	({
		insertRules: vi.fn().mockResolvedValue(["id1"]),
	}) as unknown as AccessRulesWriter;

const getInsertSchema = () =>
	new InsertRulesEndpoint(
		makeMockWriter(),
		makeMockLogger(),
	).getRequestArgsSchema();

describe("blocking rule shapes: plain Block", () => {
	it("accepts a bare Block", () => {
		const result = accessPolicyInput.safeParse({
			type: AccessPolicyType.Block,
			description: "bare block",
		});
		expect(result.success).toBe(true);
	});

	it("rejects captchaType and solvedImagesCount together", () => {
		const result = accessPolicyInput.safeParse({
			type: AccessPolicyType.Block,
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.map((i) => i.path.at(-1)).sort()).toEqual([
				"captchaType",
				"solvedImagesCount",
			]);
		}
	});

	it("strips both fields on the way into storage", () => {
		expect(
			sanitizeAccessPolicy({
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
				solvedImagesCount: 2,
				description: "legacy block",
			}),
		).toEqual({
			type: AccessPolicyType.Block,
			description: "legacy block",
		});
	});
});

describe("blocking rule shapes: Block + deferToVerify", () => {
	it("accepts the flag on its own, and preserves it", () => {
		const result = accessPolicyInput.safeParse({
			type: AccessPolicyType.Block,
			deferToVerify: true,
			description: "deferred block",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deferToVerify).toBe(true);
		}
	});

	// The shape that 400s the rule-sync push. The refinement has no
	// deferToVerify carve-out, so a deferred Block is held to the same
	// rule as a plain one.
	it("rejects captchaType and solvedImagesCount despite the flag", () => {
		const result = accessPolicyInput.safeParse({
			type: AccessPolicyType.Block,
			deferToVerify: true,
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.map((i) => i.path.at(-1)).sort()).toEqual([
				"captchaType",
				"solvedImagesCount",
			]);
		}
	});

	// Even were the refinement to admit them, the sanitiser drops them
	// before storage — the flag does not exempt a Block here either.
	it("strips both fields on the way into storage", () => {
		expect(
			sanitizeAccessPolicy({
				type: AccessPolicyType.Block,
				deferToVerify: true,
				captchaType: CaptchaType.image,
				solvedImagesCount: 2,
				description: "deferred block",
			}),
		).toEqual({
			type: AccessPolicyType.Block,
			deferToVerify: true,
			description: "deferred block",
		});
	});

	it("round-trips the flag from its stored string form", () => {
		const result = accessPolicyInput.safeParse({
			type: AccessPolicyType.Block,
			deferToVerify: "true",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deferToVerify).toBe(true);
		}
	});
});

describe("blocking rule shapes: Restrict keeps its tuning fields", () => {
	it("accepts captchaType and solvedImagesCount, with or without the flag", () => {
		for (const deferToVerify of [undefined, true]) {
			const result = accessPolicyInput.safeParse({
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				solvedImagesCount: 2,
				...(deferToVerify === undefined ? {} : { deferToVerify }),
			});
			expect(result.success).toBe(true);
		}
	});

	it("survives the sanitiser intact", () => {
		expect(
			sanitizeAccessPolicy({
				type: AccessPolicyType.Restrict,
				deferToVerify: true,
				captchaType: CaptchaType.image,
				solvedImagesCount: 2,
			}),
		).toEqual({
			type: AccessPolicyType.Restrict,
			deferToVerify: true,
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		});
	});
});

// The insert endpoint validates the batch as one `z.array`, so validity
// is all-or-nothing across the whole push.
describe("blocking rule shapes: batch validation", () => {
	const validGroup = {
		accessPolicy: {
			type: AccessPolicyType.Block,
			deferToVerify: true,
			description: "deferred block",
		},
		userScopes: [{ ip: "1.1.1.1" }],
	};

	const invalidGroup = {
		accessPolicy: {
			type: AccessPolicyType.Block,
			deferToVerify: true,
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
			description: "deferred block with tuning fields",
		},
		userScopes: [{ ip: "2.2.2.2" }],
	};

	it("accepts a batch of well-formed groups", () => {
		const result = getInsertSchema().safeParse([validGroup, validGroup]);
		expect(result.success).toBe(true);
	});

	it("rejects the entire batch when a single group is malformed", () => {
		const batch = [
			...Array.from({ length: 20 }, () => validGroup),
			invalidGroup,
			...Array.from({ length: 20 }, () => validGroup),
		];

		const result = getInsertSchema().safeParse(batch);

		expect(result.success).toBe(false);
		if (!result.success) {
			// Every issue points at the one bad group; the other 40 are
			// well-formed and are still rejected along with it.
			expect(result.error.issues.map((i) => i.path[0])).toEqual([20, 20]);
		}
	});
});
