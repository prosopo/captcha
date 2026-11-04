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
	type ImageCaptcha,
	ImageCaptchaSchema,
	ImageCaptchaWithSolutionsSchema,
	IpAddressType,
	PoWCaptchaStoredSchema,
	RequestType,
	RequestTypeSchema,
	SessionSchema,
	UserCommitmentSchema,
	UserCommitmentWithSolutionsSchema,
} from "@prosopo/types";
import {
	AudioCaptchaRecordSchema,
	IconOrderCaptchaRecordSchema,
	ImageCaptchaRecordSchema,
	PoWCaptchaRecordSchema,
	PuzzleCaptchaRecordSchema,
	SessionRecordSchema,
	StoredAudioCaptchaRecordSchema,
	StoredIconOrderCaptchaRecordSchema,
	StoredImageCaptchaRecordSchema,
	StoredPoWCaptchaRecordSchema,
	StoredPuzzleCaptchaRecordSchema,
	StoredSessionRecordSchema,
	StoredUserCommitmentRecordSchema,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import mongoose, { type Schema } from "mongoose";
import { describe, expect, it } from "vitest";

const recordSchemas: [string, Schema, RequestType][] = [
	["Session", SessionRecordSchema, RequestType.session],
	["StoredSession", StoredSessionRecordSchema, RequestType.session],
	["PoW", PoWCaptchaRecordSchema, RequestType.powcaptcha],
	["StoredPoW", StoredPoWCaptchaRecordSchema, RequestType.powcaptcha],
	["Image", ImageCaptchaRecordSchema, RequestType.imagecaptcha],
	["StoredImage", StoredImageCaptchaRecordSchema, RequestType.imagecaptcha],
	["Puzzle", PuzzleCaptchaRecordSchema, RequestType.puzzlecaptcha],
	["StoredPuzzle", StoredPuzzleCaptchaRecordSchema, RequestType.puzzlecaptcha],
	["Audio", AudioCaptchaRecordSchema, RequestType.audiocaptcha],
	["StoredAudio", StoredAudioCaptchaRecordSchema, RequestType.audiocaptcha],
	["IconOrder", IconOrderCaptchaRecordSchema, RequestType.iconordercaptcha],
	[
		"StoredIconOrder",
		StoredIconOrderCaptchaRecordSchema,
		RequestType.iconordercaptcha,
	],
];

const imageCaptcha: ImageCaptcha = {
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

describe("requestType discriminator", () => {
	it("RequestTypeSchema accepts every RequestType value", () => {
		for (const value of Object.values(RequestType)) {
			expect(RequestTypeSchema.parse(value)).toBe(value);
		}
	});

	it("RequestTypeSchema rejects unknown request types", () => {
		expect(() => RequestTypeSchema.parse("not-a-request-type")).toThrow();
	});

	it.each(recordSchemas)(
		"%s record schema defaults requestType on new documents",
		(name, schema, expected) => {
			const model = mongoose.model(`RequestTypeTest${name}`, schema);
			expect(new model().get("requestType")).toBe(expected);
		},
	);

	it.each(recordSchemas)(
		"%s record schema rejects an unknown requestType",
		(name, schema) => {
			const model =
				mongoose.models[`RequestTypeTest${name}`] ??
				mongoose.model(`RequestTypeTest${name}`, schema);
			const error = new model({ requestType: "bogus" }).validateSync([
				"requestType",
			]);
			expect(error?.errors.requestType).toBeDefined();
		},
	);

	it("zod record schemas parse records with and without requestType", () => {
		expect(ImageCaptchaSchema.parse(imageCaptcha).requestType).toBeUndefined();
		expect(
			ImageCaptchaSchema.parse({
				...imageCaptcha,
				requestType: RequestType.imagecaptcha,
			}).requestType,
		).toBe(RequestType.imagecaptcha);
		for (const schema of [PoWCaptchaStoredSchema, SessionSchema]) {
			expect(schema.shape.requestType.isOptional()).toBe(true);
		}
	});

	it("zod record schemas reject an unknown requestType", () => {
		expect(() =>
			ImageCaptchaSchema.parse({ ...imageCaptcha, requestType: "bogus" }),
		).toThrow();
	});
});

describe("UserCommitment aliases", () => {
	it("point at the ImageCaptcha schemas", () => {
		expect(UserCommitmentSchema).toBe(ImageCaptchaSchema);
		expect(UserCommitmentWithSolutionsSchema).toBe(
			ImageCaptchaWithSolutionsSchema,
		);
		expect(UserCommitmentRecordSchema).toBe(ImageCaptchaRecordSchema);
		expect(StoredUserCommitmentRecordSchema).toBe(
			StoredImageCaptchaRecordSchema,
		);
	});
});
