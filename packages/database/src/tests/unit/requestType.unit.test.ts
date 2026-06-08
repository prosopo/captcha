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

import {
	CaptchaStatus,
	ImageCaptchaSchema,
	IpAddressType,
	PoWCaptchaStoredSchema,
	RequestType,
	RequestTypeSchema,
	SessionSchema,
	UserCommitmentSchema,
} from "@prosopo/types";
import {
	ImageCaptchaRecordSchema,
	PoWCaptchaRecordSchema,
	PuzzleCaptchaRecordSchema,
	SessionRecordSchema,
	StoredImageCaptchaRecordSchema,
	StoredUserCommitmentRecordSchema,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import mongoose, { type Schema } from "mongoose";
import { describe, expect, it } from "vitest";

describe("RequestType discriminator", () => {
	it("RequestTypeSchema accepts every RequestType value", () => {
		for (const value of Object.values(RequestType)) {
			expect(RequestTypeSchema.parse(value)).toBe(value);
		}
	});

	it("RequestTypeSchema rejects unknown request types", () => {
		expect(() => RequestTypeSchema.parse("not-a-request-type")).toThrow();
	});

	it("Mongoose record schemas stamp the correct requestType default on new docs", () => {
		const cases: Array<[string, Schema, RequestType]> = [
			["ReqTypeTestSession", SessionRecordSchema, RequestType.session],
			["ReqTypeTestPow", PoWCaptchaRecordSchema, RequestType.powcaptcha],
			["ReqTypeTestImage", ImageCaptchaRecordSchema, RequestType.imagecaptcha],
			["ReqTypeTestPuzzle", PuzzleCaptchaRecordSchema, RequestType.puzzlecaptcha],
		];
		for (const [modelName, schema, expected] of cases) {
			expect(schema.path("requestType").instance).toBe("String");
			// A throwaway model (no DB connection needed) applies schema defaults
			// at construction time — the same path production writes take.
			const model =
				mongoose.models[modelName] ?? mongoose.model(modelName, schema);
			const doc = new model();
			expect(doc.get("requestType")).toBe(expected);
		}
	});

	it("Zod record schemas expose requestType as optional (back-compat)", () => {
		for (const schema of [
			ImageCaptchaSchema,
			PoWCaptchaStoredSchema,
			SessionSchema,
		]) {
			expect(schema.shape.requestType.isOptional()).toBe(true);
		}
	});

	it("ImageCaptchaSchema parses records with and without requestType", () => {
		const base = {
			userAccount: "u",
			dappAccount: "d",
			datasetId: "ds",
			providerAccount: "p",
			id: "id",
			result: { status: CaptchaStatus.approved },
			userSignature: "",
			ipAddress: { lower: 1n, type: IpAddressType.v4 },
			headers: {},
			ja4: "",
			userSubmitted: true,
			serverChecked: true,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "0x0",
			requestHash: "0x0",
			deadlineTimestamp: new Date(),
			threshold: 0.8,
		};
		expect(() => ImageCaptchaSchema.parse(base)).not.toThrow();
		expect(() =>
			ImageCaptchaSchema.parse({
				...base,
				requestType: RequestType.imagecaptcha,
			}),
		).not.toThrow();
	});
});

describe("UserCommitment -> ImageCaptcha back-compat aliases", () => {
	it("deprecated schema aliases are identity-equal to the new schemas", () => {
		expect(UserCommitmentSchema).toBe(ImageCaptchaSchema);
		expect(UserCommitmentRecordSchema).toBe(ImageCaptchaRecordSchema);
		expect(StoredUserCommitmentRecordSchema).toBe(
			StoredImageCaptchaRecordSchema,
		);
	});
});
