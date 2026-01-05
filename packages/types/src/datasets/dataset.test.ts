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
import { CaptchaItemTypes, CaptchaTypes } from "./captcha.js";
import {
	DatasetSchema,
	DatasetWithIdsAndTreeSchema,
	DatasetWithIdsSchema,
	DatasetWithNumericSolutionSchema,
} from "./dataset.js";

describe("dataset schemas", () => {
	describe("DatasetSchema", () => {
		it("validates dataset with required fields", () => {
			const dataset = {
				captchas: [
					{
						salt: "a".repeat(34),
						items: [
							{
								hash: "0x1234",
								data: "item1",
								type: CaptchaItemTypes.Text,
							},
						],
						target: "target1",
					},
				],
				format: CaptchaTypes.SelectAll,
			};

			expect(() => DatasetSchema.parse(dataset)).not.toThrow();
		});

		it("validates dataset with optional fields", () => {
			const dataset = {
				datasetId: "dataset123",
				datasetContentId: "content123",
				captchas: [
					{
						salt: "a".repeat(34),
						items: [
							{
								hash: "0x1234",
								data: "item1",
								type: CaptchaItemTypes.Text,
							},
						],
						target: "target1",
					},
				],
				format: CaptchaTypes.SelectAll,
				solutionTree: [["0x1234"]],
				contentTree: [["0x5678"]],
				timeLimit: 60000,
			};

			expect(() => DatasetSchema.parse(dataset)).not.toThrow();
		});

		it("rejects dataset without required fields", () => {
			const invalidDataset = {
				captchas: [],
			};

			expect(() => DatasetSchema.parse(invalidDataset)).toThrow();
		});
	});

	describe("DatasetWithNumericSolutionSchema", () => {
		it("validates dataset with numeric solution", () => {
			const dataset = {
				captchas: [
					{
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
					},
				],
				format: CaptchaTypes.SelectAll,
			};

			expect(() =>
				DatasetWithNumericSolutionSchema.parse(dataset),
			).not.toThrow();
		});
	});

	describe("DatasetWithIdsSchema", () => {
		it("validates dataset with IDs", () => {
			const dataset = {
				datasetId: "dataset123",
				captchas: [
					{
						captchaId: "captcha1",
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
					},
				],
				format: CaptchaTypes.SelectAll,
			};

			expect(() => DatasetWithIdsSchema.parse(dataset)).not.toThrow();
		});

		it("validates dataset with optional contentTree and solutionTree", () => {
			const dataset = {
				datasetId: "dataset123",
				captchas: [
					{
						captchaId: "captcha1",
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
					},
				],
				format: CaptchaTypes.SelectAll,
				solutionTree: [["0x1234"]],
				contentTree: [["0x5678"]],
			};

			expect(() => DatasetWithIdsSchema.parse(dataset)).not.toThrow();
		});
	});

	describe("DatasetWithIdsAndTreeSchema", () => {
		it("validates dataset with IDs and trees", () => {
			const dataset = {
				datasetId: "dataset123",
				captchas: [
					{
						captchaId: "captcha1",
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
					},
				],
				format: CaptchaTypes.SelectAll,
				solutionTree: [["0x1234"]],
				contentTree: [["0x5678"]],
			};

			expect(() => DatasetWithIdsAndTreeSchema.parse(dataset)).not.toThrow();
		});

		it("rejects dataset without required trees", () => {
			const dataset = {
				datasetId: "dataset123",
				captchas: [
					{
						captchaId: "captcha1",
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
					},
				],
				format: CaptchaTypes.SelectAll,
			};

			expect(() => DatasetWithIdsAndTreeSchema.parse(dataset)).toThrow();
		});
	});
});
