import { loadI18next } from "@prosopo/locale";
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
import { describe, expect, it, vi } from "vitest";
import { ProsopoApiError, unwrapError } from "../error.js";
import type { Logger } from "../logger.js";

describe("unwrap error", () => {
	let logger: Logger;

	it("should unwrap a nested Prosopo error", async () => {
		const inner = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400 },
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner },
		});
		const i18n = await loadI18next(true);
		const unwrapped = unwrapError(outer, i18n);
		expect(unwrapped.code).to.equal(400);

		expect(unwrapped.jsonError.message).to.equal("Missing body");
		expect(unwrapped.jsonError.key).to.equal("API.MISSING_BODY");
		expect(unwrapped.jsonError.code).to.equal(400);
		expect(unwrapped.statusMessage).to.equal("Bad Request");
	});

	it("should unwrap a double nested Prosopo error", async () => {
		const inner1 = new ProsopoApiError("API.UNAUTHORIZED", {
			context: { code: 401 },
		});
		const inner2 = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400, error: inner1 },
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner2 },
		});
		const i18n = await loadI18next(true);
		const unwrapped = unwrapError(outer, i18n);
		expect(unwrapped.code).to.equal(401);

		expect(unwrapped.jsonError.message).to.equal("Unauthorized");
		expect(unwrapped.jsonError.key).to.equal("API.UNAUTHORIZED");
		expect(unwrapped.jsonError.code).to.equal(401);
		expect(unwrapped.statusMessage).to.equal("Bad Request");
	});

	it("should not unwrap a base Error class", async () => {
		const inner1 = new Error("I should not be seen");
		const inner2 = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400, error: inner1 },
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner2 },
		});
		const i18n = await loadI18next(true);
		const unwrapped = unwrapError(outer, i18n);
		expect(unwrapped.code).to.equal(400);

		expect(unwrapped.jsonError.message).to.equal("Missing body");
		expect(unwrapped.jsonError.key).to.equal("API.MISSING_BODY");
		expect(unwrapped.jsonError.code).to.equal(400);
		expect(unwrapped.statusMessage).to.equal("Bad Request");
	});
});
