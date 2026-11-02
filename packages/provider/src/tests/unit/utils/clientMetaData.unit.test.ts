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

import type { ClientMetaData } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	isClientSessionMismatch,
	toStoredClientMetaData,
} from "../../../utils/clientMetaData.js";

describe("toStoredClientMetaData", () => {
	it("returns undefined when nothing was supplied", () => {
		expect(toStoredClientMetaData(undefined)).toBeUndefined();
	});

	it("returns undefined when every field is empty", () => {
		const empty: ClientMetaData = { hp: "", clientSessionId: "" };
		expect(toStoredClientMetaData(empty)).toBeUndefined();
	});

	it("keeps the honeypot value on its own", () => {
		expect(toStoredClientMetaData({ hp: "bot-typed-this" })).toEqual({
			hp: "bot-typed-this",
		});
	});

	it("keeps the client session id on its own", () => {
		expect(toStoredClientMetaData({ clientSessionId: "jti-1" })).toEqual({
			clientSessionId: "jti-1",
		});
	});

	it("keeps both fields when both are set", () => {
		const both: ClientMetaData = { hp: "trap", clientSessionId: "jti-1" };
		expect(toStoredClientMetaData(both)).toEqual(both);
	});

	it("drops unset fields rather than storing undefined", () => {
		const stored = toStoredClientMetaData({ clientSessionId: "jti-1" });
		expect(stored && Object.keys(stored)).toEqual(["clientSessionId"]);
	});
});

describe("isClientSessionMismatch", () => {
	it("is not a mismatch when the site asked for no correlation", () => {
		expect(isClientSessionMismatch(undefined, undefined)).toBe(false);
		expect(isClientSessionMismatch(undefined, "jti-1")).toBe(false);
		expect(isClientSessionMismatch("", "jti-1")).toBe(false);
	});

	it("is not a mismatch when the recorded value matches", () => {
		expect(isClientSessionMismatch("jti-1", "jti-1")).toBe(false);
	});

	it("is a mismatch when the recorded value differs", () => {
		expect(isClientSessionMismatch("jti-1", "jti-2")).toBe(true);
	});

	it("is a mismatch when the solve carries no session id at all", () => {
		expect(isClientSessionMismatch("jti-1", undefined)).toBe(true);
	});

	it("does not treat a differently-cased id as a match", () => {
		expect(isClientSessionMismatch("JTI-1", "jti-1")).toBe(true);
	});
});
