import path from "node:path";
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
import { computeItemHash, matchItemsToSolutions } from "../index.js";
import { validateDatasetContent } from "../index.js";

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
});
