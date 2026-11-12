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

import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { translate } from "../translate.js";

// One sequential flow: i18next is a process-wide singleton and cannot be
// uninitialised again, so the two states are checked in order in one test.
describe("translate", () => {
	it("returns the key before i18next is initialised, then the translation", async () => {
		expect(i18n.isInitialized).toBeFalsy();
		expect(translate("API.USER_NOT_VERIFIED")).toBe("API.USER_NOT_VERIFIED");

		await i18n.init({
			lng: "en",
			resources: {
				en: { translation: { API: { USER_NOT_VERIFIED: "Not verified" } } },
			},
		});

		expect(translate("API.USER_NOT_VERIFIED")).toBe("Not verified");
		// A key the loaded resources lack falls back to the key, as i18next does.
		expect(translate("API.USER_NOT_VERIFIED_TIME_EXPIRED")).toBe(
			"API.USER_NOT_VERIFIED_TIME_EXPIRED",
		);
	});
});
