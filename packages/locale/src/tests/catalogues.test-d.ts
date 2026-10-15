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

// Every catalogue must have the English catalogue's shape, so a key deleted
// from one language fails `pnpm --filter @prosopo/locale run typecheck`, not
// just the runtime check in locales.unit.test.ts. Keys a language has on top
// of English are not caught here (an imported JSON is not a fresh literal, so
// TypeScript skips the excess-property check); the runtime test catches them.

import { describe, expectTypeOf, it } from "vitest";
import arCatalogue from "../locales/ar/translation.json" with { type: "json" };
import azCatalogue from "../locales/az/translation.json" with { type: "json" };
import csCatalogue from "../locales/cs/translation.json" with { type: "json" };
import deCatalogue from "../locales/de/translation.json" with { type: "json" };
import elCatalogue from "../locales/el/translation.json" with { type: "json" };
import enCatalogue from "../locales/en/translation.json" with { type: "json" };
import esCatalogue from "../locales/es/translation.json" with { type: "json" };
import fiCatalogue from "../locales/fi/translation.json" with { type: "json" };
import frCatalogue from "../locales/fr/translation.json" with { type: "json" };
import hiCatalogue from "../locales/hi/translation.json" with { type: "json" };
import huCatalogue from "../locales/hu/translation.json" with { type: "json" };
import idCatalogue from "../locales/id/translation.json" with { type: "json" };
import itCatalogue from "../locales/it/translation.json" with { type: "json" };
import jaCatalogue from "../locales/ja/translation.json" with { type: "json" };
import jvCatalogue from "../locales/jv/translation.json" with { type: "json" };
import koCatalogue from "../locales/ko/translation.json" with { type: "json" };
import mlCatalogue from "../locales/ml/translation.json" with { type: "json" };
import msCatalogue from "../locales/ms/translation.json" with { type: "json" };
import nlCatalogue from "../locales/nl/translation.json" with { type: "json" };
import noCatalogue from "../locales/no/translation.json" with { type: "json" };
import plCatalogue from "../locales/pl/translation.json" with { type: "json" };
import ptBrCatalogue from "../locales/pt-BR/translation.json" with {
	type: "json",
};
import ptCatalogue from "../locales/pt/translation.json" with { type: "json" };
import roCatalogue from "../locales/ro/translation.json" with { type: "json" };
import ruCatalogue from "../locales/ru/translation.json" with { type: "json" };
import srCatalogue from "../locales/sr/translation.json" with { type: "json" };
import svCatalogue from "../locales/sv/translation.json" with { type: "json" };
import thCatalogue from "../locales/th/translation.json" with { type: "json" };
import trCatalogue from "../locales/tr/translation.json" with { type: "json" };
import ukCatalogue from "../locales/uk/translation.json" with { type: "json" };
import viCatalogue from "../locales/vi/translation.json" with { type: "json" };
import zhCnCatalogue from "../locales/zh-CN/translation.json" with {
	type: "json",
};
import zhCatalogue from "../locales/zh/translation.json" with { type: "json" };
import type { Language } from "../translations.js";

type Catalogue = typeof enCatalogue;

// `satisfies Record<Language, …>` also fails when a supported language has no
// catalogue here, or one is listed that is not a supported language.
const catalogues = {
	ar: arCatalogue,
	az: azCatalogue,
	cs: csCatalogue,
	de: deCatalogue,
	el: elCatalogue,
	en: enCatalogue,
	es: esCatalogue,
	fi: fiCatalogue,
	fr: frCatalogue,
	hi: hiCatalogue,
	hu: huCatalogue,
	id: idCatalogue,
	it: itCatalogue,
	ja: jaCatalogue,
	jv: jvCatalogue,
	ko: koCatalogue,
	ml: mlCatalogue,
	ms: msCatalogue,
	nl: nlCatalogue,
	no: noCatalogue,
	pl: plCatalogue,
	pt: ptCatalogue,
	"pt-BR": ptBrCatalogue,
	ro: roCatalogue,
	ru: ruCatalogue,
	sr: srCatalogue,
	sv: svCatalogue,
	th: thCatalogue,
	tr: trCatalogue,
	uk: ukCatalogue,
	vi: viCatalogue,
	zh: zhCatalogue,
	"zh-CN": zhCnCatalogue,
} satisfies Record<Language, Catalogue>;

describe("locale catalogues", () => {
	it("all share the English shape", () => {
		expectTypeOf(catalogues).toExtend<Record<Language, Catalogue>>();
	});

	it("have string leaves, which is what the translate functions return", () => {
		expectTypeOf(catalogues.tr.TARGET.owl).toEqualTypeOf<string>();
		expectTypeOf(catalogues.tr.WIDGET.SELECT_ALL).toEqualTypeOf<string>();
	});
});
