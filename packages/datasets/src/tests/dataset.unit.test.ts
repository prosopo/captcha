import path from "node:path";
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
import {
	type Captcha,
	CaptchaItemTypes,
	type CaptchaSolution,
	CaptchaTypes,
	type Dataset,
	type Item,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import { beforeAll, describe, expect, test } from "vitest";
import {
	addSolutionHashesToDataset,
	buildCaptchaTree,
	buildDataset,
	computeItemHash,
	hashDatasetItems,
	matchItemsToSolutions,
} from "../index.js";
import { validateDatasetContent } from "../index.js";
import type { DatasetRaw } from "@prosopo/types";

describe("DATASET FUNCTIONS", async () => {
	let MOCK_ITEMS: Item[];
	let DATASET: Dataset;
	let RECEIVED: CaptchaSolution[];
	let STORED: Captcha[];
	beforeAll(async () => {
		MOCK_ITEMS = await Promise.all(
			new Array(9).fill(0).map((_, i) =>
				computeItemHash({
					data: path.join(
						"http://localhost",
						`/tests/js/mocks/data/img/01.0${i + 1}.jpeg`,
					),
					type: CaptchaItemTypes.Text,
					hash: "",
				}),
			),
		);

		const ITEMS = [
			{
				type: CaptchaItemTypes.Text,
				data: "blah1",
				hash: "0xf50c63a914dac984e8e0ad16673f0c7224422d439ec19342d89ea985bc439040",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah2",
				hash: "0xb22ba232374e4970ff72533bd84a0f4a86a31323518448a7820d08639bdec2f5",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah3",
				hash: "0xe67b75b0c213c04693d9be4992319912ae9317039570221c640e243040b222ac",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah4",
				hash: "0x95bd4e306b9ea73216179900e16a62b247e5f371a60fca72f7af84b314998bf6",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah5",
				hash: "0x70bbf5a7aec5a3bb7109310ff5c4bf0915a504a3c0c7a69f3b514c67bd53f8ca",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah6",
				hash: "0x66e6e346cfb7ecc73d64c5bbc10bd6eea3f55e0ef33037e2ebf8111f59b809be",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah7",
				hash: "0xcf00c099c10c8d8678b29a166798e5720801053a9ac35b52ba623d3a0cebe468",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah8",
				hash: "0x5981107cf8d5ab3a562d79b489ffd2b5b9e5fc0fce67aea550eab292069bbbee",
			},
			{
				type: CaptchaItemTypes.Text,
				data: "blah9",
				hash: "0x7f54f8853ac73d0590c038075895c59d0c4ef5c31340b34c1dc65cbe1765e0d0",
			},
		];

		DATASET = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					captchaId:
						"0x7e6d425c3aae7194e06ff5f6f40ae7ce3f28f3cedff572d94141294af357bec2",
					captchaContentId: "0x01010101010101010101010101010101",
					solution: [],
					salt: "0x01010101010101010101010101010101",
					target: "bus",
					items: ITEMS,
				},
				{
					captchaId:
						"0xff104b75ea2eff08e9cbc8deeee26be24c1e731f3f64eee430dccfe2687be289",
					captchaContentId: "0x01010101010101010101010101010101",
					salt: "0x02020202020202020202020202020202",
					target: "train",
					items: ITEMS,
				},
			],
		};

		RECEIVED = [
			{
				captchaId:
					"0x65389f35bfda0ce10a80baea75e34c8defc5ec22931ccc5ef66f3c273ba4ec38",
				captchaContentId: "0x01010101010101010101010101010101",
				solution: matchItemsToSolutions([0, 1, 2], MOCK_ITEMS),
				salt: "",
			},
			{
				captchaId:
					"0x138c099916b1877ceba74fbd93a441bc561103b087e3dbe751d486bd854644d3",
				captchaContentId: "0x01010101010101010101010101010101",
				solution: matchItemsToSolutions([0, 1, 2], MOCK_ITEMS),
				salt: "",
			},
		];

		STORED = [
			{
				captchaId:
					"0x65389f35bfda0ce10a80baea75e34c8defc5ec22931ccc5ef66f3c273ba4ec38",
				captchaContentId: "0x01010101010101010101010101010101",
				salt: "0x01010101010101010101010101010101",
				items: MOCK_ITEMS,
				target: "",
				solved: true,
			},
			{
				captchaId:
					"0x138c099916b1877ceba74fbd93a441bc561103b087e3dbe751d486bd854644d3",
				captchaContentId: "0x01010101010101010101010101010101",
				salt: "0x02020202020202020202020202020202",
				items: MOCK_ITEMS,
				target: "",
				solved: true,
			},
		];
	});

	test("Validates a captcha dataset correctly", async () => {
		// duplicate the CAPTCHAS in DATASET.captchas by 1000 times
		DATASET.captchas = new Array(10000)
			.fill(0)
			.map(() => at(DATASET.captchas, 0));
		const validated = await validateDatasetContent(DATASET);
		expect(validated).to.be.true;
	});

	test("hashDatasetItems hashes all items in dataset captchas", async () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "test1",
							hash: "",
						},
						{
							type: CaptchaItemTypes.Text,
							data: "test2",
							hash: "",
						},
					],
					target: "test",
					salt: "0x01",
				},
			],
		};

		const captchaPromises = await hashDatasetItems(datasetRaw);
		const captchas = await Promise.all(captchaPromises);

		expect(captchas).to.have.length(1);
		expect(captchas[0]?.items).to.have.length(2);
		expect(captchas[0]?.items[0]?.hash).to.be.a("string");
		expect(captchas[0]?.items[0]?.hash).to.not.equal("");
		expect(captchas[0]?.items[1]?.hash).to.be.a("string");
		expect(captchas[0]?.items[1]?.hash).to.not.equal("");
	});

	test("hashDatasetItems handles empty captchas array", async () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [],
		};

		const captchaPromises = await hashDatasetItems(datasetRaw);
		const captchas = await Promise.all(captchaPromises);

		expect(captchas).to.have.length(0);
	});

	test("addSolutionHashesToDataset converts numeric solutions to hashes", () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
						{
							type: CaptchaItemTypes.Text,
							data: "item2",
							hash: "0xhash2",
						},
					],
					solution: [0, 1] as number[],
					target: "test",
					salt: "0x01",
				},
			],
		};

		const result = addSolutionHashesToDataset(datasetRaw);

		expect(result.captchas[0]?.solution).to.deep.equal(["0xhash1", "0xhash2"]);
		expect(result.captchas[0]?.items).to.deep.equal(datasetRaw.captchas[0]?.items);
	});

	test("addSolutionHashesToDataset handles captchas without solutions", () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					target: "test",
					salt: "0x01",
				},
			],
		};

		const result = addSolutionHashesToDataset(datasetRaw);

		expect(result.captchas[0]?.solution).to.be.undefined;
	});

	test("addSolutionHashesToDataset handles already hashed solutions", () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
						{
							type: CaptchaItemTypes.Text,
							data: "item2",
							hash: "0xhash2",
						},
					],
					solution: ["0xhash1", "0xhash2"] as string[],
					target: "test",
					salt: "0x01",
				},
			],
		};

		const result = addSolutionHashesToDataset(datasetRaw);

		expect(result.captchas[0]?.solution).to.deep.equal(["0xhash1", "0xhash2"]);
	});

	test("buildCaptchaTree builds tree with correct configuration", async () => {
		const dataset: Dataset = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					captchaId: "0x01",
					captchaContentId: "0x01",
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					target: "test",
					salt: "0x01",
					solution: [],
				},
			],
		};

		const tree = await buildCaptchaTree(dataset, false, false, false);

		expect(tree.root).to.not.be.undefined;
		expect(tree.leaves).to.have.length(1);
		expect(tree.layers).to.have.length.greaterThan(0);
	});

	test("buildCaptchaTree includes solution when includeSolution is true", async () => {
		const dataset: Dataset = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					captchaId: "0x01",
					captchaContentId: "0x01",
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					target: "test",
					salt: "0x01",
					solution: ["0xhash1"],
				},
			],
		};

		const treeWithSolution = await buildCaptchaTree(dataset, true, false, false);
		const treeWithoutSolution = await buildCaptchaTree(dataset, false, false, false);

		expect(treeWithSolution.root?.hash).to.not.equal(
			treeWithoutSolution.root?.hash,
		);
	});

	test("buildCaptchaTree includes salt when includeSalt is true", async () => {
		const dataset: Dataset = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					captchaId: "0x01",
					captchaContentId: "0x01",
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					target: "test",
					salt: "0x01",
					solution: [],
				},
			],
		};

		const treeWithSalt = await buildCaptchaTree(dataset, false, true, false);
		const treeWithoutSalt = await buildCaptchaTree(dataset, false, false, false);

		expect(treeWithSalt.root?.hash).to.not.equal(treeWithoutSalt.root?.hash);
	});

	test("buildCaptchaTree sorts item hashes when sortItemHashes is true", async () => {
		const dataset: Dataset = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					captchaId: "0x01",
					captchaContentId: "0x01",
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item2",
							hash: "0xhash2",
						},
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					target: "test",
					salt: "0x01",
					solution: [],
				},
			],
		};

		const treeSorted = await buildCaptchaTree(dataset, false, false, true);
		const treeUnsorted = await buildCaptchaTree(dataset, false, false, false);

		expect(treeSorted.root?.hash).to.not.equal(treeUnsorted.root?.hash);
	});

	test("buildDataset creates complete dataset with trees and IDs", async () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					solution: [0] as number[],
					target: "test",
					salt: "0x01",
				},
			],
		};

		const result = await buildDataset(datasetRaw);

		expect(result.captchas[0]?.captchaId).to.be.a("string");
		expect(result.captchas[0]?.captchaContentId).to.be.a("string");
		expect(result.captchas[0]?.datasetId).to.be.a("string");
		expect(result.captchas[0]?.datasetContentId).to.be.a("string");
		expect(result.datasetId).to.be.a("string");
		expect(result.datasetContentId).to.be.a("string");
		expect(result.solutionTree).to.be.an("array");
		expect(result.contentTree).to.be.an("array");
		expect(result.captchas[0]?.datasetId).to.equal(result.datasetId);
		expect(result.captchas[0]?.datasetContentId).to.equal(result.datasetContentId);
	});

	test("buildDataset handles multiple captchas", async () => {
		const datasetRaw: DatasetRaw = {
			format: CaptchaTypes.SelectAll,
			captchas: [
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item1",
							hash: "0xhash1",
						},
					],
					solution: [0] as number[],
					target: "test1",
					salt: "0x01",
				},
				{
					items: [
						{
							type: CaptchaItemTypes.Text,
							data: "item2",
							hash: "0xhash2",
						},
					],
					solution: [0] as number[],
					target: "test2",
					salt: "0x02",
				},
			],
		};

		const result = await buildDataset(datasetRaw);

		expect(result.captchas).to.have.length(2);
		expect(result.captchas[0]?.captchaId).to.not.equal(
			result.captchas[1]?.captchaId,
		);
		expect(result.captchas[0]?.datasetId).to.equal(result.captchas[1]?.datasetId);
	});
});
