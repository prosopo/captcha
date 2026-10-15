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

// Every catalogue file must have the English file's shape, so a key deleted
// from one language fails `pnpm --filter @prosopo/locale run typecheck`, not
// just the runtime check in locales.unit.test.ts. Keys a language has on top
// of English are not caught here (an imported JSON is not a fresh literal, so
// TypeScript skips the excess-property check); the runtime test catches them.

import { describe, expectTypeOf, it } from "vitest";
import arTarget from "../locales/ar/target.json" with { type: "json" };
import arServer from "../locales/ar/translation.json" with { type: "json" };
import arWidget from "../locales/ar/widget.json" with { type: "json" };
import azTarget from "../locales/az/target.json" with { type: "json" };
import azServer from "../locales/az/translation.json" with { type: "json" };
import azWidget from "../locales/az/widget.json" with { type: "json" };
import csTarget from "../locales/cs/target.json" with { type: "json" };
import csServer from "../locales/cs/translation.json" with { type: "json" };
import csWidget from "../locales/cs/widget.json" with { type: "json" };
import deTarget from "../locales/de/target.json" with { type: "json" };
import deServer from "../locales/de/translation.json" with { type: "json" };
import deWidget from "../locales/de/widget.json" with { type: "json" };
import elTarget from "../locales/el/target.json" with { type: "json" };
import elServer from "../locales/el/translation.json" with { type: "json" };
import elWidget from "../locales/el/widget.json" with { type: "json" };
import enTarget from "../locales/en/target.json" with { type: "json" };
import enServer from "../locales/en/translation.json" with { type: "json" };
import enWidget from "../locales/en/widget.json" with { type: "json" };
import esTarget from "../locales/es/target.json" with { type: "json" };
import esServer from "../locales/es/translation.json" with { type: "json" };
import esWidget from "../locales/es/widget.json" with { type: "json" };
import fiTarget from "../locales/fi/target.json" with { type: "json" };
import fiServer from "../locales/fi/translation.json" with { type: "json" };
import fiWidget from "../locales/fi/widget.json" with { type: "json" };
import frTarget from "../locales/fr/target.json" with { type: "json" };
import frServer from "../locales/fr/translation.json" with { type: "json" };
import frWidget from "../locales/fr/widget.json" with { type: "json" };
import hiTarget from "../locales/hi/target.json" with { type: "json" };
import hiServer from "../locales/hi/translation.json" with { type: "json" };
import hiWidget from "../locales/hi/widget.json" with { type: "json" };
import huTarget from "../locales/hu/target.json" with { type: "json" };
import huServer from "../locales/hu/translation.json" with { type: "json" };
import huWidget from "../locales/hu/widget.json" with { type: "json" };
import idTarget from "../locales/id/target.json" with { type: "json" };
import idServer from "../locales/id/translation.json" with { type: "json" };
import idWidget from "../locales/id/widget.json" with { type: "json" };
import itTarget from "../locales/it/target.json" with { type: "json" };
import itServer from "../locales/it/translation.json" with { type: "json" };
import itWidget from "../locales/it/widget.json" with { type: "json" };
import jaTarget from "../locales/ja/target.json" with { type: "json" };
import jaServer from "../locales/ja/translation.json" with { type: "json" };
import jaWidget from "../locales/ja/widget.json" with { type: "json" };
import jvTarget from "../locales/jv/target.json" with { type: "json" };
import jvServer from "../locales/jv/translation.json" with { type: "json" };
import jvWidget from "../locales/jv/widget.json" with { type: "json" };
import koTarget from "../locales/ko/target.json" with { type: "json" };
import koServer from "../locales/ko/translation.json" with { type: "json" };
import koWidget from "../locales/ko/widget.json" with { type: "json" };
import mlTarget from "../locales/ml/target.json" with { type: "json" };
import mlServer from "../locales/ml/translation.json" with { type: "json" };
import mlWidget from "../locales/ml/widget.json" with { type: "json" };
import msTarget from "../locales/ms/target.json" with { type: "json" };
import msServer from "../locales/ms/translation.json" with { type: "json" };
import msWidget from "../locales/ms/widget.json" with { type: "json" };
import nlTarget from "../locales/nl/target.json" with { type: "json" };
import nlServer from "../locales/nl/translation.json" with { type: "json" };
import nlWidget from "../locales/nl/widget.json" with { type: "json" };
import noTarget from "../locales/no/target.json" with { type: "json" };
import noServer from "../locales/no/translation.json" with { type: "json" };
import noWidget from "../locales/no/widget.json" with { type: "json" };
import plTarget from "../locales/pl/target.json" with { type: "json" };
import plServer from "../locales/pl/translation.json" with { type: "json" };
import plWidget from "../locales/pl/widget.json" with { type: "json" };
import ptBrTarget from "../locales/pt-BR/target.json" with { type: "json" };
import ptBrServer from "../locales/pt-BR/translation.json" with {
	type: "json",
};
import ptBrWidget from "../locales/pt-BR/widget.json" with { type: "json" };
import ptTarget from "../locales/pt/target.json" with { type: "json" };
import ptServer from "../locales/pt/translation.json" with { type: "json" };
import ptWidget from "../locales/pt/widget.json" with { type: "json" };
import roTarget from "../locales/ro/target.json" with { type: "json" };
import roServer from "../locales/ro/translation.json" with { type: "json" };
import roWidget from "../locales/ro/widget.json" with { type: "json" };
import ruTarget from "../locales/ru/target.json" with { type: "json" };
import ruServer from "../locales/ru/translation.json" with { type: "json" };
import ruWidget from "../locales/ru/widget.json" with { type: "json" };
import srTarget from "../locales/sr/target.json" with { type: "json" };
import srServer from "../locales/sr/translation.json" with { type: "json" };
import srWidget from "../locales/sr/widget.json" with { type: "json" };
import svTarget from "../locales/sv/target.json" with { type: "json" };
import svServer from "../locales/sv/translation.json" with { type: "json" };
import svWidget from "../locales/sv/widget.json" with { type: "json" };
import thTarget from "../locales/th/target.json" with { type: "json" };
import thServer from "../locales/th/translation.json" with { type: "json" };
import thWidget from "../locales/th/widget.json" with { type: "json" };
import trTarget from "../locales/tr/target.json" with { type: "json" };
import trServer from "../locales/tr/translation.json" with { type: "json" };
import trWidget from "../locales/tr/widget.json" with { type: "json" };
import ukTarget from "../locales/uk/target.json" with { type: "json" };
import ukServer from "../locales/uk/translation.json" with { type: "json" };
import ukWidget from "../locales/uk/widget.json" with { type: "json" };
import viTarget from "../locales/vi/target.json" with { type: "json" };
import viServer from "../locales/vi/translation.json" with { type: "json" };
import viWidget from "../locales/vi/widget.json" with { type: "json" };
import zhCnTarget from "../locales/zh-CN/target.json" with { type: "json" };
import zhCnServer from "../locales/zh-CN/translation.json" with {
	type: "json",
};
import zhCnWidget from "../locales/zh-CN/widget.json" with { type: "json" };
import zhTarget from "../locales/zh/target.json" with { type: "json" };
import zhServer from "../locales/zh/translation.json" with { type: "json" };
import zhWidget from "../locales/zh/widget.json" with { type: "json" };
import type { Language } from "../translations.js";

/** One language's three namespace files (see NAMESPACES in translationKey.ts). */
type Catalogue = {
	widget: typeof enWidget;
	target: typeof enTarget;
	translation: typeof enServer;
};

// `satisfies Record<Language, …>` also fails when a supported language has no
// catalogue here, or one is listed that is not a supported language.
const catalogues = {
	ar: {
		widget: arWidget,
		target: arTarget,
		translation: arServer,
	},
	az: {
		widget: azWidget,
		target: azTarget,
		translation: azServer,
	},
	cs: {
		widget: csWidget,
		target: csTarget,
		translation: csServer,
	},
	de: {
		widget: deWidget,
		target: deTarget,
		translation: deServer,
	},
	el: {
		widget: elWidget,
		target: elTarget,
		translation: elServer,
	},
	en: {
		widget: enWidget,
		target: enTarget,
		translation: enServer,
	},
	es: {
		widget: esWidget,
		target: esTarget,
		translation: esServer,
	},
	fi: {
		widget: fiWidget,
		target: fiTarget,
		translation: fiServer,
	},
	fr: {
		widget: frWidget,
		target: frTarget,
		translation: frServer,
	},
	hi: {
		widget: hiWidget,
		target: hiTarget,
		translation: hiServer,
	},
	hu: {
		widget: huWidget,
		target: huTarget,
		translation: huServer,
	},
	id: {
		widget: idWidget,
		target: idTarget,
		translation: idServer,
	},
	it: {
		widget: itWidget,
		target: itTarget,
		translation: itServer,
	},
	ja: {
		widget: jaWidget,
		target: jaTarget,
		translation: jaServer,
	},
	jv: {
		widget: jvWidget,
		target: jvTarget,
		translation: jvServer,
	},
	ko: {
		widget: koWidget,
		target: koTarget,
		translation: koServer,
	},
	ml: {
		widget: mlWidget,
		target: mlTarget,
		translation: mlServer,
	},
	ms: {
		widget: msWidget,
		target: msTarget,
		translation: msServer,
	},
	nl: {
		widget: nlWidget,
		target: nlTarget,
		translation: nlServer,
	},
	no: {
		widget: noWidget,
		target: noTarget,
		translation: noServer,
	},
	pl: {
		widget: plWidget,
		target: plTarget,
		translation: plServer,
	},
	pt: {
		widget: ptWidget,
		target: ptTarget,
		translation: ptServer,
	},
	"pt-BR": {
		widget: ptBrWidget,
		target: ptBrTarget,
		translation: ptBrServer,
	},
	ro: {
		widget: roWidget,
		target: roTarget,
		translation: roServer,
	},
	ru: {
		widget: ruWidget,
		target: ruTarget,
		translation: ruServer,
	},
	sr: {
		widget: srWidget,
		target: srTarget,
		translation: srServer,
	},
	sv: {
		widget: svWidget,
		target: svTarget,
		translation: svServer,
	},
	th: {
		widget: thWidget,
		target: thTarget,
		translation: thServer,
	},
	tr: {
		widget: trWidget,
		target: trTarget,
		translation: trServer,
	},
	uk: {
		widget: ukWidget,
		target: ukTarget,
		translation: ukServer,
	},
	vi: {
		widget: viWidget,
		target: viTarget,
		translation: viServer,
	},
	zh: {
		widget: zhWidget,
		target: zhTarget,
		translation: zhServer,
	},
	"zh-CN": {
		widget: zhCnWidget,
		target: zhCnTarget,
		translation: zhCnServer,
	},
} satisfies Record<Language, Catalogue>;

describe("locale catalogues", () => {
	it("all share the English shape", () => {
		expectTypeOf(catalogues).toExtend<Record<Language, Catalogue>>();
	});

	it("have string leaves, which is what the translate functions return", () => {
		expectTypeOf(catalogues.tr.target.TARGET.owl).toEqualTypeOf<string>();
		expectTypeOf(
			catalogues.tr.widget.WIDGET.SELECT_ALL,
		).toEqualTypeOf<string>();
		expectTypeOf(
			catalogues.tr.translation.DATABASE.UNKNOWN,
		).toEqualTypeOf<string>();
	});
});
