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
	mergeSubmitDetectorData,
	submitDetectorDataSets,
} from "../../../databases/submitDetectorData.js";

describe("submitDetectorDataSets", () => {
	it("sets each key one level down, so separate submissions don't collide", () => {
		expect(submitDetectorDataSets({ b: { x: ["1"], y: ["2"] } })).toEqual({
			"dSubmit.b.x": ["1"],
			"dSubmit.b.y": ["2"],
		});
	});

	it("sets a top-level value that isn't an object whole", () => {
		expect(submitDetectorDataSets({ n: 3, list: [1] })).toEqual({
			"dSubmit.n": 3,
			"dSubmit.list": [1],
		});
	});

	it("drops keys that could address another path", () => {
		expect(
			submitDetectorDataSets({
				"a.b": 1,
				$where: 2,
				b: { "x.y": 3, $set: 4, ok: 5 },
			}),
		).toEqual({ "dSubmit.b.ok": 5 });
	});
});

describe("mergeSubmitDetectorData", () => {
	it("merges objects one level deep and replaces everything else", () => {
		expect(
			mergeSubmitDetectorData(
				{ b: { first: ["x"] }, k: 1, n: 2 },
				{ b: { second: ["y"] }, n: 3 },
			),
		).toEqual({ b: { first: ["x"], second: ["y"] }, k: 1, n: 3 });
	});

	it("works when detection reported nothing", () => {
		expect(mergeSubmitDetectorData(undefined, { b: { x: ["1"] } })).toEqual({
			b: { x: ["1"] },
		});
	});

	it("does not change the bag it was given", () => {
		const detected = { b: { first: ["x"] } };
		mergeSubmitDetectorData(detected, { b: { second: ["y"] } });
		expect(detected).toEqual({ b: { first: ["x"] } });
	});
});
