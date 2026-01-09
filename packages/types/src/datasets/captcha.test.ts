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
import { describe, expect, it } from "vitest";
import {
	CaptchaItemSchema,
	CaptchaItemTypes,
	CaptchaSchema,
	CaptchaSolutionArraySchema,
	CaptchaSolutionSchema,
	CaptchaStates,
	CaptchaStatus,
	CaptchaTypes,
	DataSchema,
	HashedCaptchaItemSchema,
	LabelledDataSchema,
	LabelledItemSchema,
	MaybeLabelledHashedItemSchema,
	POW_SEPARATOR,
	PowChallengeIdSchema,
	SelectAllCaptchaSchema,
	SelectAllCaptchaSchemaWithNumericSolution,
} from "./captcha.js";

describe("captcha schemas", () => {
	describe("CaptchaItemSchema", () => {
		it("validates valid captcha item", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
			};

			expect(() => CaptchaItemSchema.parse(item)).not.toThrow();
		});

		it("validates image type captcha item", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "image data",
				type: CaptchaItemTypes.Image,
			};

			expect(() => CaptchaItemSchema.parse(item)).not.toThrow();
		});

		it("rejects item without required fields", () => {
			const invalidItem = {
				hash: "0x1234",
			};

			expect(() => CaptchaItemSchema.parse(invalidItem)).toThrow();
		});

		it("rejects invalid type", () => {
			const invalidItem = {
				hash: "0x1234",
				data: "test",
				type: "invalid",
			};

			expect(() => CaptchaItemSchema.parse(invalidItem)).toThrow();
		});
	});

	describe("HashedCaptchaItemSchema", () => {
		it("validates hashed captcha item", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
			};

			expect(() => HashedCaptchaItemSchema.parse(item)).not.toThrow();
		});
	});

	describe("LabelledItemSchema", () => {
		it("validates labelled item with label", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
				label: "label1",
			};

			expect(() => LabelledItemSchema.parse(item)).not.toThrow();
		});

		it("rejects item without label", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
			};

			expect(() => LabelledItemSchema.parse(item)).toThrow();
		});
	});

	describe("MaybeLabelledHashedItemSchema", () => {
		it("validates item with label", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
				label: "label1",
			};

			expect(() => MaybeLabelledHashedItemSchema.parse(item)).not.toThrow();
		});

		it("validates item without label", () => {
			const item = {
				hash: "0x1234567890abcdef",
				data: "test data",
				type: CaptchaItemTypes.Text,
			};

			expect(() => MaybeLabelledHashedItemSchema.parse(item)).not.toThrow();
		});
	});

	describe("CaptchaSchema", () => {
		it("validates captcha with required fields", () => {
			const captcha = {
				salt: "a".repeat(34),
			};

			expect(() => CaptchaSchema.parse(captcha)).not.toThrow();
		});

		it("validates captcha with optional fields", () => {
			const captcha = {
				captchaId: "captcha123",
				captchaContentId: "content123",
				salt: "a".repeat(34),
				solution: [1, 2, 3],
				unlabelled: [4, 5],
				timeLimit: 60000,
			};

			expect(() => CaptchaSchema.parse(captcha)).not.toThrow();
		});

		it("rejects captcha with salt shorter than 34 characters", () => {
			const captcha = {
				salt: "short",
			};

			expect(() => CaptchaSchema.parse(captcha)).toThrow();
		});
	});

	describe("SelectAllCaptchaSchema", () => {
		it("validates select all captcha", () => {
			const captcha = {
				salt: "a".repeat(34),
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
					},
				],
				target: "target1",
				solution: ["0x1234"],
			};

			expect(() => SelectAllCaptchaSchema.parse(captcha)).not.toThrow();
		});

		it("validates select all captcha with unlabelled items", () => {
			const captcha = {
				salt: "a".repeat(34),
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
					},
				],
				target: "target1",
				solution: ["0x1234"],
				unlabelled: ["0x5678"],
			};

			expect(() => SelectAllCaptchaSchema.parse(captcha)).not.toThrow();
		});
	});

	describe("SelectAllCaptchaSchemaWithNumericSolution", () => {
		it("validates captcha with numeric solution", () => {
			const captcha = {
				salt: "a".repeat(34),
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
					},
				],
				target: "target1",
				solution: [0, 1, 2],
			};

			expect(() =>
				SelectAllCaptchaSchemaWithNumericSolution.parse(captcha),
			).not.toThrow();
		});
	});

	describe("CaptchaSolutionSchema", () => {
		it("validates captcha solution", () => {
			const solution = {
				captchaId: "captcha123",
				captchaContentId: "content123",
				salt: "a".repeat(34),
				solution: ["0x1234", "0x5678"],
			};

			expect(() => CaptchaSolutionSchema.parse(solution)).not.toThrow();
		});

		it("rejects solution without required fields", () => {
			const invalidSolution = {
				captchaId: "captcha123",
			};

			expect(() => CaptchaSolutionSchema.parse(invalidSolution)).toThrow();
		});
	});

	describe("CaptchaSolutionArraySchema", () => {
		it("validates array of captcha solutions", () => {
			const solutions = [
				{
					captchaId: "captcha1",
					captchaContentId: "content1",
					salt: "a".repeat(34),
					solution: ["0x1234"],
				},
				{
					captchaId: "captcha2",
					captchaContentId: "content2",
					salt: "b".repeat(34),
					solution: ["0x5678"],
				},
			];

			expect(() => CaptchaSolutionArraySchema.parse(solutions)).not.toThrow();
		});

		it("validates empty array", () => {
			expect(() => CaptchaSolutionArraySchema.parse([])).not.toThrow();
		});
	});

	describe("DataSchema", () => {
		it("validates data with items", () => {
			const data = {
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
					},
				],
			};

			expect(() => DataSchema.parse(data)).not.toThrow();
		});

		it("validates data with labelled items", () => {
			const data = {
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
						label: "label1",
					},
				],
			};

			expect(() => DataSchema.parse(data)).not.toThrow();
		});
	});

	describe("LabelledDataSchema", () => {
		it("validates labelled data", () => {
			const data = {
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
						label: "label1",
					},
				],
			};

			expect(() => LabelledDataSchema.parse(data)).not.toThrow();
		});

		it("rejects data with unlabelled items", () => {
			const data = {
				items: [
					{
						hash: "0x1234",
						data: "item1",
						type: CaptchaItemTypes.Text,
					},
				],
			};

			expect(() => LabelledDataSchema.parse(data)).toThrow();
		});
	});

	describe("PowChallengeIdSchema", () => {
		it("validates valid PoW challenge ID", () => {
			// Schema expects 4 parts when split by POW_SEPARATOR
			const challengeId = `1234567890${POW_SEPARATOR}userAccount${POW_SEPARATOR}dappAccount${POW_SEPARATOR}extra`;
			expect(() => PowChallengeIdSchema.parse(challengeId)).not.toThrow();
		});

		it("rejects challenge ID with invalid format", () => {
			const invalidId = "not-a-valid-challenge-id";
			expect(() => PowChallengeIdSchema.parse(invalidId)).toThrow();
		});

		it("rejects challenge ID with non-numeric timestamp", () => {
			const invalidId = `not-a-number${POW_SEPARATOR}user${POW_SEPARATOR}dapp`;
			expect(() => PowChallengeIdSchema.parse(invalidId)).toThrow();
		});

		it("rejects challenge ID with wrong number of parts", () => {
			const invalidId = `1234567890${POW_SEPARATOR}user`;
			expect(() => PowChallengeIdSchema.parse(invalidId)).toThrow();
		});

		it("validates challenge ID with all required parts", () => {
			const challengeId = `1234567890${POW_SEPARATOR}userAccount${POW_SEPARATOR}dappAccount${POW_SEPARATOR}extra`;
			expect(() => PowChallengeIdSchema.parse(challengeId)).not.toThrow();
		});

	});

	describe("enums", () => {
		it("CaptchaTypes enum has correct values", () => {
			expect(CaptchaTypes.SelectAll).toBe("SelectAll");
		});

		it("CaptchaItemTypes enum has correct values", () => {
			expect(CaptchaItemTypes.Text).toBe("text");
			expect(CaptchaItemTypes.Image).toBe("image");
		});

		it("CaptchaStates enum has correct values", () => {
			expect(CaptchaStates.Solved).toBe("solved");
			expect(CaptchaStates.Unsolved).toBe("unsolved");
		});

		it("CaptchaStatus enum has correct values", () => {
			expect(CaptchaStatus.pending).toBe("Pending");
			expect(CaptchaStatus.approved).toBe("Approved");
			expect(CaptchaStatus.disapproved).toBe("Disapproved");
		});
	});
});
