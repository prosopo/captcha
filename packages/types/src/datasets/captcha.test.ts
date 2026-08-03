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
import { describe, expect, it } from "vitest";
import {
	CaptchaItemTypes,
	CaptchaSchema,
	CaptchaSolutionArraySchema,
	CaptchaSolutionSchema,
	CaptchaStates,
	CaptchasSchema,
	DataSchema,
	LabelledDataSchema,
	POW_SEPARATOR,
	PowChallengeIdSchema,
	SelectAllCaptchaSchema,
	SelectAllCaptchaSchemaRaw,
} from "./captcha.js";

const salt = "0x0123456789abcdef0123456789abcdef01";

const challenge = (parts: string[]): string => parts.join(POW_SEPARATOR);

describe("POW_SEPARATOR", () => {
	it("is a triple underscore, which cannot appear in an ss58 address", () => {
		expect(POW_SEPARATOR).toBe("___");
	});
});

describe("PowChallengeIdSchema", () => {
	it("accepts a four part challenge, as the provider issues", () => {
		expect(
			PowChallengeIdSchema.safeParse(
				challenge(["1700000000000", "user", "dapp", "7"]),
			).success,
		).toBe(true);
	});

	it("rejects a three part challenge, which predates the nonce", () => {
		expect(
			PowChallengeIdSchema.safeParse(challenge(["1700000000000", "u", "d"]))
				.success,
		).toBe(false);
	});

	it("rejects a five part challenge", () => {
		expect(
			PowChallengeIdSchema.safeParse(challenge(["1", "u", "d", "0", "extra"]))
				.success,
		).toBe(false);
	});

	it("rejects a challenge with no separators at all", () => {
		expect(PowChallengeIdSchema.safeParse("1700000000000").success).toBe(false);
	});

	it("rejects an empty challenge", () => {
		expect(PowChallengeIdSchema.safeParse("").success).toBe(false);
	});

	it("does not check that the timestamp is numeric", () => {
		// the parseInt result is discarded and parseInt never throws, so the
		// validator only counts segments
		expect(
			PowChallengeIdSchema.safeParse(challenge(["notanumber", "u", "d", "0"]))
				.success,
		).toBe(true);
	});

	it("accepts empty segments", () => {
		expect(
			PowChallengeIdSchema.safeParse(challenge(["", "", "", ""])).success,
		).toBe(true);
	});

	it("treats a single underscore as ordinary content", () => {
		expect(
			PowChallengeIdSchema.safeParse(challenge(["1", "a_b", "c_d", "0"]))
				.success,
		).toBe(true);
	});
});

describe("CaptchaSchema", () => {
	it("accepts an unsolved captcha", () => {
		expect(
			CaptchaSchema.safeParse({
				captchaId: undefined,
				captchaContentId: undefined,
				salt,
			}).success,
		).toBe(true);
	});

	it("requires a salt of at least 34 characters", () => {
		expect(
			CaptchaSchema.safeParse({
				captchaId: undefined,
				captchaContentId: undefined,
				salt: "0x01",
			}).success,
		).toBe(false);
		expect(CaptchaSchema.safeParse({ salt: "a".repeat(34) }).success).toBe(
			true,
		);
		expect(CaptchaSchema.safeParse({ salt: "a".repeat(33) }).success).toBe(
			false,
		);
	});

	it("lets the id fields be omitted entirely, since undefined is in their union", () => {
		expect(CaptchaSchema.safeParse({ salt }).success).toBe(true);
	});

	it("takes a numeric solution index array", () => {
		const result = CaptchaSchema.safeParse({
			captchaId: "id",
			captchaContentId: "cid",
			salt,
			solution: [0, 2],
			unlabelled: [],
			timeLimit: 30000,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a string solution on the numeric schema", () => {
		expect(
			CaptchaSchema.safeParse({
				captchaId: "id",
				captchaContentId: "cid",
				salt,
				solution: ["a"],
			}).success,
		).toBe(false);
	});
});

describe("SelectAllCaptchaSchema", () => {
	const base = {
		captchaId: "id",
		captchaContentId: "cid",
		salt,
		target: "bus",
		items: [
			{
				hash: "0x1",
				data: "data:image/png;base64,",
				type: CaptchaItemTypes.Image,
			},
		],
	};

	it("requires a target and items", () => {
		expect(SelectAllCaptchaSchemaRaw.safeParse(base).success).toBe(true);
		const { target: _target, ...noTarget } = base;
		expect(SelectAllCaptchaSchemaRaw.safeParse(noTarget).success).toBe(false);
	});

	it("accepts an empty item list, which the round logic must handle", () => {
		expect(
			SelectAllCaptchaSchemaRaw.safeParse({ ...base, items: [] }).success,
		).toBe(true);
	});

	it("rejects an unknown item type", () => {
		expect(
			SelectAllCaptchaSchemaRaw.safeParse({
				...base,
				items: [{ hash: "0x1", data: "d", type: "video" }],
			}).success,
		).toBe(false);
	});

	it("takes hashed string solutions on the non-raw variant", () => {
		expect(
			SelectAllCaptchaSchema.safeParse({ ...base, solution: ["0xabc"] })
				.success,
		).toBe(true);
	});

	it("validates a list of captchas", () => {
		expect(CaptchasSchema.safeParse([base, base]).success).toBe(true);
		expect(CaptchasSchema.safeParse([]).success).toBe(true);
		expect(CaptchasSchema.safeParse([{}]).success).toBe(false);
	});
});

describe("CaptchaSolutionSchema", () => {
	const solution = {
		captchaId: "id",
		captchaContentId: "cid",
		solution: ["0xa", "0xb"],
		salt: "s",
	};

	it("accepts a solution", () => {
		expect(CaptchaSolutionSchema.safeParse(solution).success).toBe(true);
	});

	it("accepts an empty solution, meaning nothing was selected", () => {
		expect(
			CaptchaSolutionSchema.safeParse({ ...solution, solution: [] }).success,
		).toBe(true);
	});

	it("requires every field", () => {
		for (const key of Object.keys(solution)) {
			const partial: Record<string, unknown> = { ...solution };
			delete partial[key];
			expect(CaptchaSolutionSchema.safeParse(partial).success).toBe(false);
		}
	});

	it("does not bound the salt length, unlike the captcha itself", () => {
		expect(
			CaptchaSolutionSchema.safeParse({ ...solution, salt: "" }).success,
		).toBe(true);
	});

	it("validates an array of solutions, including an empty one", () => {
		expect(CaptchaSolutionArraySchema.safeParse([]).success).toBe(true);
		expect(CaptchaSolutionArraySchema.safeParse([solution]).success).toBe(true);
		expect(CaptchaSolutionArraySchema.safeParse(solution).success).toBe(false);
	});
});

describe("dataset item schemas", () => {
	const item = { hash: "0x1", data: "d", type: CaptchaItemTypes.Image };

	it("allows an unlabelled item in the general data schema", () => {
		expect(DataSchema.safeParse({ items: [item] }).success).toBe(true);
	});

	it("requires a label in the labelled data schema", () => {
		expect(LabelledDataSchema.safeParse({ items: [item] }).success).toBe(false);
		expect(
			LabelledDataSchema.safeParse({ items: [{ ...item, label: "bus" }] })
				.success,
		).toBe(true);
	});

	it("accepts an empty dataset", () => {
		expect(DataSchema.safeParse({ items: [] }).success).toBe(true);
	});
});

describe("enums", () => {
	it("names the captcha item types it can render", () => {
		expect(Object.values(CaptchaItemTypes)).toContain(CaptchaItemTypes.Image);
	});

	it("names the captcha states", () => {
		expect(Object.values(CaptchaStates).length).toBeGreaterThan(0);
	});
});
