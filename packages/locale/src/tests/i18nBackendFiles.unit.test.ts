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
import loadI18next from "../loadI18next.js";
import type { Ti18n } from "../types.js";

// The real provider setup: i18next, the fs backend and the locale files on
// disk. Proves loadI18next resolves only once every namespace file is read,
// and that a key resolves without naming its namespace.

describe("server i18n over the split catalogue", () => {
	it("has every namespace loaded by the time loadI18next resolves", async () => {
		const i18n: Ti18n = await loadI18next(true);

		expect(i18n.hasLoadedNamespace("translation")).toBe(true);
		expect(i18n.hasLoadedNamespace("widget")).toBe(true);
		expect(i18n.hasLoadedNamespace("target")).toBe(true);
		expect(i18n.t("TARGET.owl", { lng: "en" })).toBe("owl");
		expect(i18n.t("WIDGET.SELECT_ALL", { lng: "en" })).toBe(
			"Select all containing the following:",
		);
		expect(i18n.t("DATABASE.UNKNOWN", { lng: "en" })).toBe(
			"Unknown database error",
		);
	});

	it("translates keys from all three namespaces into another language", async () => {
		const i18n: Ti18n = await loadI18next(true);
		// What i18next-http-middleware does per request.
		await i18n.changeLanguage("tr");

		expect(i18n.language).toBe("tr");
		expect(i18n.t("TARGET.owl")).toBe("baykuş");
		expect(i18n.t("WIDGET.SELECT_ALL")).toBe(
			"Aşağıdakini içeren tüm görselleri seçin:",
		);
		expect(i18n.t("DATABASE.UNKNOWN")).toBe("Bilinmeyen veritabanı hatası");
	});
});
