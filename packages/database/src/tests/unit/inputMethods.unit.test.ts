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

import { InputMethod, UserCommitmentSchema } from "@prosopo/types";
import { UserCommitmentRecordSchema } from "@prosopo/types-database";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

const Commitment = mongoose.model(
	"InputMethodsCommitment",
	UserCommitmentRecordSchema,
);

describe("commitment input methods", () => {
	it("keeps the input methods when a commitment is parsed for storage", () => {
		const inputMethods: InputMethod[][] = [
			[InputMethod.keyboard],
			[InputMethod.pointer, InputMethod.keyboard],
		];
		expect(UserCommitmentSchema.shape.inputMethods.parse(inputMethods)).toEqual(
			inputMethods,
		);
	});

	it("allows a commitment without input methods", () => {
		expect(UserCommitmentSchema.shape.inputMethods.isOptional()).toBe(true);
	});

	it("stores input methods in the shape of the coordinates", () => {
		const doc = new Commitment({
			inputMethods: [[InputMethod.keyboard], [InputMethod.pointer]],
		});
		expect(doc.validateSync(["inputMethods"])).toBeUndefined();
		expect(doc.toObject().inputMethods).toEqual([
			[InputMethod.keyboard],
			[InputMethod.pointer],
		]);
	});

	it("refuses to store an unknown input method", () => {
		const doc = new Commitment({ inputMethods: [["voice"]] });
		expect(doc.validateSync(["inputMethods"])).toBeDefined();
	});

	it("leaves input methods out of a commitment that has none", () => {
		expect(new Commitment({}).toObject().inputMethods).toBeUndefined();
	});
});
