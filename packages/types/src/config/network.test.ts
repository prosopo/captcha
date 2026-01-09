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
import { NetworkPairTypeSchema } from "./network.js";

describe("NetworkPairTypeSchema", () => {
	it("validates sr25519 keypair type", () => {
		expect(() => NetworkPairTypeSchema.parse("sr25519")).not.toThrow();
	});

	it("validates ed25519 keypair type", () => {
		expect(() => NetworkPairTypeSchema.parse("ed25519")).not.toThrow();
	});

	it("validates ecdsa keypair type", () => {
		expect(() => NetworkPairTypeSchema.parse("ecdsa")).not.toThrow();
	});

	it("validates ethereum keypair type", () => {
		expect(() => NetworkPairTypeSchema.parse("ethereum")).not.toThrow();
	});

	it("rejects invalid keypair type", () => {
		expect(() => NetworkPairTypeSchema.parse("invalid")).toThrow();
		expect(() => NetworkPairTypeSchema.parse("rsa")).toThrow();
		expect(() => NetworkPairTypeSchema.parse("")).toThrow();
		expect(() => NetworkPairTypeSchema.parse(null)).toThrow();
		expect(() => NetworkPairTypeSchema.parse(undefined)).toThrow();
	});
});