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
import afTarget from "../locales/af/target.json" with { type: "json" };
import afServer from "../locales/af/translation.json" with { type: "json" };
import afWidget from "../locales/af/widget.json" with { type: "json" };
import amTarget from "../locales/am/target.json" with { type: "json" };
import amServer from "../locales/am/translation.json" with { type: "json" };
import amWidget from "../locales/am/widget.json" with { type: "json" };
import anTarget from "../locales/an/target.json" with { type: "json" };
import anServer from "../locales/an/translation.json" with { type: "json" };
import anWidget from "../locales/an/widget.json" with { type: "json" };
import arTarget from "../locales/ar/target.json" with { type: "json" };
import arServer from "../locales/ar/translation.json" with { type: "json" };
import arWidget from "../locales/ar/widget.json" with { type: "json" };
import asTarget from "../locales/as/target.json" with { type: "json" };
import asServer from "../locales/as/translation.json" with { type: "json" };
import asWidget from "../locales/as/widget.json" with { type: "json" };
import astTarget from "../locales/ast/target.json" with { type: "json" };
import astServer from "../locales/ast/translation.json" with { type: "json" };
import astWidget from "../locales/ast/widget.json" with { type: "json" };
import azTarget from "../locales/az/target.json" with { type: "json" };
import azServer from "../locales/az/translation.json" with { type: "json" };
import azWidget from "../locales/az/widget.json" with { type: "json" };
import beTarget from "../locales/be/target.json" with { type: "json" };
import beServer from "../locales/be/translation.json" with { type: "json" };
import beWidget from "../locales/be/widget.json" with { type: "json" };
import bgTarget from "../locales/bg/target.json" with { type: "json" };
import bgServer from "../locales/bg/translation.json" with { type: "json" };
import bgWidget from "../locales/bg/widget.json" with { type: "json" };
import bnTarget from "../locales/bn/target.json" with { type: "json" };
import bnServer from "../locales/bn/translation.json" with { type: "json" };
import bnWidget from "../locales/bn/widget.json" with { type: "json" };
import bsTarget from "../locales/bs/target.json" with { type: "json" };
import bsServer from "../locales/bs/translation.json" with { type: "json" };
import bsWidget from "../locales/bs/widget.json" with { type: "json" };
import caTarget from "../locales/ca/target.json" with { type: "json" };
import caServer from "../locales/ca/translation.json" with { type: "json" };
import caWidget from "../locales/ca/widget.json" with { type: "json" };
import csTarget from "../locales/cs/target.json" with { type: "json" };
import csServer from "../locales/cs/translation.json" with { type: "json" };
import csWidget from "../locales/cs/widget.json" with { type: "json" };
import cyTarget from "../locales/cy/target.json" with { type: "json" };
import cyServer from "../locales/cy/translation.json" with { type: "json" };
import cyWidget from "../locales/cy/widget.json" with { type: "json" };
import daTarget from "../locales/da/target.json" with { type: "json" };
import daServer from "../locales/da/translation.json" with { type: "json" };
import daWidget from "../locales/da/widget.json" with { type: "json" };
import deTarget from "../locales/de/target.json" with { type: "json" };
import deServer from "../locales/de/translation.json" with { type: "json" };
import deWidget from "../locales/de/widget.json" with { type: "json" };
import elTarget from "../locales/el/target.json" with { type: "json" };
import elServer from "../locales/el/translation.json" with { type: "json" };
import elWidget from "../locales/el/widget.json" with { type: "json" };
import enGbTarget from "../locales/en-GB/target.json" with { type: "json" };
import enGbServer from "../locales/en-GB/translation.json" with {
	type: "json",
};
import enGbWidget from "../locales/en-GB/widget.json" with { type: "json" };
import enTarget from "../locales/en/target.json" with { type: "json" };
import enServer from "../locales/en/translation.json" with { type: "json" };
import enWidget from "../locales/en/widget.json" with { type: "json" };
import eoTarget from "../locales/eo/target.json" with { type: "json" };
import eoServer from "../locales/eo/translation.json" with { type: "json" };
import eoWidget from "../locales/eo/widget.json" with { type: "json" };
import esTarget from "../locales/es/target.json" with { type: "json" };
import esServer from "../locales/es/translation.json" with { type: "json" };
import esWidget from "../locales/es/widget.json" with { type: "json" };
import etTarget from "../locales/et/target.json" with { type: "json" };
import etServer from "../locales/et/translation.json" with { type: "json" };
import etWidget from "../locales/et/widget.json" with { type: "json" };
import euTarget from "../locales/eu/target.json" with { type: "json" };
import euServer from "../locales/eu/translation.json" with { type: "json" };
import euWidget from "../locales/eu/widget.json" with { type: "json" };
import faTarget from "../locales/fa/target.json" with { type: "json" };
import faServer from "../locales/fa/translation.json" with { type: "json" };
import faWidget from "../locales/fa/widget.json" with { type: "json" };
import fiTarget from "../locales/fi/target.json" with { type: "json" };
import fiServer from "../locales/fi/translation.json" with { type: "json" };
import fiWidget from "../locales/fi/widget.json" with { type: "json" };
import filTarget from "../locales/fil/target.json" with { type: "json" };
import filServer from "../locales/fil/translation.json" with { type: "json" };
import filWidget from "../locales/fil/widget.json" with { type: "json" };
import frTarget from "../locales/fr/target.json" with { type: "json" };
import frServer from "../locales/fr/translation.json" with { type: "json" };
import frWidget from "../locales/fr/widget.json" with { type: "json" };
import fyTarget from "../locales/fy/target.json" with { type: "json" };
import fyServer from "../locales/fy/translation.json" with { type: "json" };
import fyWidget from "../locales/fy/widget.json" with { type: "json" };
import gaTarget from "../locales/ga/target.json" with { type: "json" };
import gaServer from "../locales/ga/translation.json" with { type: "json" };
import gaWidget from "../locales/ga/widget.json" with { type: "json" };
import gdTarget from "../locales/gd/target.json" with { type: "json" };
import gdServer from "../locales/gd/translation.json" with { type: "json" };
import gdWidget from "../locales/gd/widget.json" with { type: "json" };
import glTarget from "../locales/gl/target.json" with { type: "json" };
import glServer from "../locales/gl/translation.json" with { type: "json" };
import glWidget from "../locales/gl/widget.json" with { type: "json" };
import guTarget from "../locales/gu/target.json" with { type: "json" };
import guServer from "../locales/gu/translation.json" with { type: "json" };
import guWidget from "../locales/gu/widget.json" with { type: "json" };
import heTarget from "../locales/he/target.json" with { type: "json" };
import heServer from "../locales/he/translation.json" with { type: "json" };
import heWidget from "../locales/he/widget.json" with { type: "json" };
import hiTarget from "../locales/hi/target.json" with { type: "json" };
import hiServer from "../locales/hi/translation.json" with { type: "json" };
import hiWidget from "../locales/hi/widget.json" with { type: "json" };
import hrTarget from "../locales/hr/target.json" with { type: "json" };
import hrServer from "../locales/hr/translation.json" with { type: "json" };
import hrWidget from "../locales/hr/widget.json" with { type: "json" };
import huTarget from "../locales/hu/target.json" with { type: "json" };
import huServer from "../locales/hu/translation.json" with { type: "json" };
import huWidget from "../locales/hu/widget.json" with { type: "json" };
import hyTarget from "../locales/hy/target.json" with { type: "json" };
import hyServer from "../locales/hy/translation.json" with { type: "json" };
import hyWidget from "../locales/hy/widget.json" with { type: "json" };
import iaTarget from "../locales/ia/target.json" with { type: "json" };
import iaServer from "../locales/ia/translation.json" with { type: "json" };
import iaWidget from "../locales/ia/widget.json" with { type: "json" };
import idTarget from "../locales/id/target.json" with { type: "json" };
import idServer from "../locales/id/translation.json" with { type: "json" };
import idWidget from "../locales/id/widget.json" with { type: "json" };
import isTarget from "../locales/is/target.json" with { type: "json" };
import isServer from "../locales/is/translation.json" with { type: "json" };
import isWidget from "../locales/is/widget.json" with { type: "json" };
import itTarget from "../locales/it/target.json" with { type: "json" };
import itServer from "../locales/it/translation.json" with { type: "json" };
import itWidget from "../locales/it/widget.json" with { type: "json" };
import jaTarget from "../locales/ja/target.json" with { type: "json" };
import jaServer from "../locales/ja/translation.json" with { type: "json" };
import jaWidget from "../locales/ja/widget.json" with { type: "json" };
import jvTarget from "../locales/jv/target.json" with { type: "json" };
import jvServer from "../locales/jv/translation.json" with { type: "json" };
import jvWidget from "../locales/jv/widget.json" with { type: "json" };
import kaTarget from "../locales/ka/target.json" with { type: "json" };
import kaServer from "../locales/ka/translation.json" with { type: "json" };
import kaWidget from "../locales/ka/widget.json" with { type: "json" };
import kkTarget from "../locales/kk/target.json" with { type: "json" };
import kkServer from "../locales/kk/translation.json" with { type: "json" };
import kkWidget from "../locales/kk/widget.json" with { type: "json" };
import kmTarget from "../locales/km/target.json" with { type: "json" };
import kmServer from "../locales/km/translation.json" with { type: "json" };
import kmWidget from "../locales/km/widget.json" with { type: "json" };
import knTarget from "../locales/kn/target.json" with { type: "json" };
import knServer from "../locales/kn/translation.json" with { type: "json" };
import knWidget from "../locales/kn/widget.json" with { type: "json" };
import koTarget from "../locales/ko/target.json" with { type: "json" };
import koServer from "../locales/ko/translation.json" with { type: "json" };
import koWidget from "../locales/ko/widget.json" with { type: "json" };
import kyTarget from "../locales/ky/target.json" with { type: "json" };
import kyServer from "../locales/ky/translation.json" with { type: "json" };
import kyWidget from "../locales/ky/widget.json" with { type: "json" };
import loTarget from "../locales/lo/target.json" with { type: "json" };
import loServer from "../locales/lo/translation.json" with { type: "json" };
import loWidget from "../locales/lo/widget.json" with { type: "json" };
import ltTarget from "../locales/lt/target.json" with { type: "json" };
import ltServer from "../locales/lt/translation.json" with { type: "json" };
import ltWidget from "../locales/lt/widget.json" with { type: "json" };
import lvTarget from "../locales/lv/target.json" with { type: "json" };
import lvServer from "../locales/lv/translation.json" with { type: "json" };
import lvWidget from "../locales/lv/widget.json" with { type: "json" };
import mkTarget from "../locales/mk/target.json" with { type: "json" };
import mkServer from "../locales/mk/translation.json" with { type: "json" };
import mkWidget from "../locales/mk/widget.json" with { type: "json" };
import mlTarget from "../locales/ml/target.json" with { type: "json" };
import mlServer from "../locales/ml/translation.json" with { type: "json" };
import mlWidget from "../locales/ml/widget.json" with { type: "json" };
import mnTarget from "../locales/mn/target.json" with { type: "json" };
import mnServer from "../locales/mn/translation.json" with { type: "json" };
import mnWidget from "../locales/mn/widget.json" with { type: "json" };
import mrTarget from "../locales/mr/target.json" with { type: "json" };
import mrServer from "../locales/mr/translation.json" with { type: "json" };
import mrWidget from "../locales/mr/widget.json" with { type: "json" };
import msTarget from "../locales/ms/target.json" with { type: "json" };
import msServer from "../locales/ms/translation.json" with { type: "json" };
import msWidget from "../locales/ms/widget.json" with { type: "json" };
import myTarget from "../locales/my/target.json" with { type: "json" };
import myServer from "../locales/my/translation.json" with { type: "json" };
import myWidget from "../locales/my/widget.json" with { type: "json" };
import neTarget from "../locales/ne/target.json" with { type: "json" };
import neServer from "../locales/ne/translation.json" with { type: "json" };
import neWidget from "../locales/ne/widget.json" with { type: "json" };
import nlTarget from "../locales/nl/target.json" with { type: "json" };
import nlServer from "../locales/nl/translation.json" with { type: "json" };
import nlWidget from "../locales/nl/widget.json" with { type: "json" };
import nnTarget from "../locales/nn/target.json" with { type: "json" };
import nnServer from "../locales/nn/translation.json" with { type: "json" };
import nnWidget from "../locales/nn/widget.json" with { type: "json" };
import noTarget from "../locales/no/target.json" with { type: "json" };
import noServer from "../locales/no/translation.json" with { type: "json" };
import noWidget from "../locales/no/widget.json" with { type: "json" };
import ocTarget from "../locales/oc/target.json" with { type: "json" };
import ocServer from "../locales/oc/translation.json" with { type: "json" };
import ocWidget from "../locales/oc/widget.json" with { type: "json" };
import orTarget from "../locales/or/target.json" with { type: "json" };
import orServer from "../locales/or/translation.json" with { type: "json" };
import orWidget from "../locales/or/widget.json" with { type: "json" };
import paTarget from "../locales/pa/target.json" with { type: "json" };
import paServer from "../locales/pa/translation.json" with { type: "json" };
import paWidget from "../locales/pa/widget.json" with { type: "json" };
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
import rmTarget from "../locales/rm/target.json" with { type: "json" };
import rmServer from "../locales/rm/translation.json" with { type: "json" };
import rmWidget from "../locales/rm/widget.json" with { type: "json" };
import roTarget from "../locales/ro/target.json" with { type: "json" };
import roServer from "../locales/ro/translation.json" with { type: "json" };
import roWidget from "../locales/ro/widget.json" with { type: "json" };
import ruTarget from "../locales/ru/target.json" with { type: "json" };
import ruServer from "../locales/ru/translation.json" with { type: "json" };
import ruWidget from "../locales/ru/widget.json" with { type: "json" };
import scoTarget from "../locales/sco/target.json" with { type: "json" };
import scoServer from "../locales/sco/translation.json" with { type: "json" };
import scoWidget from "../locales/sco/widget.json" with { type: "json" };
import siTarget from "../locales/si/target.json" with { type: "json" };
import siServer from "../locales/si/translation.json" with { type: "json" };
import siWidget from "../locales/si/widget.json" with { type: "json" };
import skTarget from "../locales/sk/target.json" with { type: "json" };
import skServer from "../locales/sk/translation.json" with { type: "json" };
import skWidget from "../locales/sk/widget.json" with { type: "json" };
import slTarget from "../locales/sl/target.json" with { type: "json" };
import slServer from "../locales/sl/translation.json" with { type: "json" };
import slWidget from "../locales/sl/widget.json" with { type: "json" };
import sqTarget from "../locales/sq/target.json" with { type: "json" };
import sqServer from "../locales/sq/translation.json" with { type: "json" };
import sqWidget from "../locales/sq/widget.json" with { type: "json" };
import srTarget from "../locales/sr/target.json" with { type: "json" };
import srServer from "../locales/sr/translation.json" with { type: "json" };
import srWidget from "../locales/sr/widget.json" with { type: "json" };
import svTarget from "../locales/sv/target.json" with { type: "json" };
import svServer from "../locales/sv/translation.json" with { type: "json" };
import svWidget from "../locales/sv/widget.json" with { type: "json" };
import swTarget from "../locales/sw/target.json" with { type: "json" };
import swServer from "../locales/sw/translation.json" with { type: "json" };
import swWidget from "../locales/sw/widget.json" with { type: "json" };
import taTarget from "../locales/ta/target.json" with { type: "json" };
import taServer from "../locales/ta/translation.json" with { type: "json" };
import taWidget from "../locales/ta/widget.json" with { type: "json" };
import teTarget from "../locales/te/target.json" with { type: "json" };
import teServer from "../locales/te/translation.json" with { type: "json" };
import teWidget from "../locales/te/widget.json" with { type: "json" };
import tgTarget from "../locales/tg/target.json" with { type: "json" };
import tgServer from "../locales/tg/translation.json" with { type: "json" };
import tgWidget from "../locales/tg/widget.json" with { type: "json" };
import thTarget from "../locales/th/target.json" with { type: "json" };
import thServer from "../locales/th/translation.json" with { type: "json" };
import thWidget from "../locales/th/widget.json" with { type: "json" };
import trTarget from "../locales/tr/target.json" with { type: "json" };
import trServer from "../locales/tr/translation.json" with { type: "json" };
import trWidget from "../locales/tr/widget.json" with { type: "json" };
import ukTarget from "../locales/uk/target.json" with { type: "json" };
import ukServer from "../locales/uk/translation.json" with { type: "json" };
import ukWidget from "../locales/uk/widget.json" with { type: "json" };
import urTarget from "../locales/ur/target.json" with { type: "json" };
import urServer from "../locales/ur/translation.json" with { type: "json" };
import urWidget from "../locales/ur/widget.json" with { type: "json" };
import uzTarget from "../locales/uz/target.json" with { type: "json" };
import uzServer from "../locales/uz/translation.json" with { type: "json" };
import uzWidget from "../locales/uz/widget.json" with { type: "json" };
import viTarget from "../locales/vi/target.json" with { type: "json" };
import viServer from "../locales/vi/translation.json" with { type: "json" };
import viWidget from "../locales/vi/widget.json" with { type: "json" };
import xhTarget from "../locales/xh/target.json" with { type: "json" };
import xhServer from "../locales/xh/translation.json" with { type: "json" };
import xhWidget from "../locales/xh/widget.json" with { type: "json" };
import zhCnTarget from "../locales/zh-CN/target.json" with { type: "json" };
import zhCnServer from "../locales/zh-CN/translation.json" with {
	type: "json",
};
import zhCnWidget from "../locales/zh-CN/widget.json" with { type: "json" };
import zhHkTarget from "../locales/zh-HK/target.json" with { type: "json" };
import zhHkServer from "../locales/zh-HK/translation.json" with {
	type: "json",
};
import zhHkWidget from "../locales/zh-HK/widget.json" with { type: "json" };
import zhTwTarget from "../locales/zh-TW/target.json" with { type: "json" };
import zhTwServer from "../locales/zh-TW/translation.json" with {
	type: "json",
};
import zhTwWidget from "../locales/zh-TW/widget.json" with { type: "json" };
import zhTarget from "../locales/zh/target.json" with { type: "json" };
import zhServer from "../locales/zh/translation.json" with { type: "json" };
import zhWidget from "../locales/zh/widget.json" with { type: "json" };
import zuTarget from "../locales/zu/target.json" with { type: "json" };
import zuServer from "../locales/zu/translation.json" with { type: "json" };
import zuWidget from "../locales/zu/widget.json" with { type: "json" };
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
	af: {
		widget: afWidget,
		target: afTarget,
		translation: afServer,
	},
	am: {
		widget: amWidget,
		target: amTarget,
		translation: amServer,
	},
	an: {
		widget: anWidget,
		target: anTarget,
		translation: anServer,
	},
	ar: {
		widget: arWidget,
		target: arTarget,
		translation: arServer,
	},
	as: {
		widget: asWidget,
		target: asTarget,
		translation: asServer,
	},
	ast: {
		widget: astWidget,
		target: astTarget,
		translation: astServer,
	},
	az: {
		widget: azWidget,
		target: azTarget,
		translation: azServer,
	},
	be: {
		widget: beWidget,
		target: beTarget,
		translation: beServer,
	},
	bg: {
		widget: bgWidget,
		target: bgTarget,
		translation: bgServer,
	},
	bn: {
		widget: bnWidget,
		target: bnTarget,
		translation: bnServer,
	},
	bs: {
		widget: bsWidget,
		target: bsTarget,
		translation: bsServer,
	},
	ca: {
		widget: caWidget,
		target: caTarget,
		translation: caServer,
	},
	cs: {
		widget: csWidget,
		target: csTarget,
		translation: csServer,
	},
	cy: {
		widget: cyWidget,
		target: cyTarget,
		translation: cyServer,
	},
	da: {
		widget: daWidget,
		target: daTarget,
		translation: daServer,
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
	"en-GB": {
		widget: enGbWidget,
		target: enGbTarget,
		translation: enGbServer,
	},
	eo: {
		widget: eoWidget,
		target: eoTarget,
		translation: eoServer,
	},
	es: {
		widget: esWidget,
		target: esTarget,
		translation: esServer,
	},
	et: {
		widget: etWidget,
		target: etTarget,
		translation: etServer,
	},
	eu: {
		widget: euWidget,
		target: euTarget,
		translation: euServer,
	},
	fa: {
		widget: faWidget,
		target: faTarget,
		translation: faServer,
	},
	fi: {
		widget: fiWidget,
		target: fiTarget,
		translation: fiServer,
	},
	fil: {
		widget: filWidget,
		target: filTarget,
		translation: filServer,
	},
	fr: {
		widget: frWidget,
		target: frTarget,
		translation: frServer,
	},
	fy: {
		widget: fyWidget,
		target: fyTarget,
		translation: fyServer,
	},
	ga: {
		widget: gaWidget,
		target: gaTarget,
		translation: gaServer,
	},
	gd: {
		widget: gdWidget,
		target: gdTarget,
		translation: gdServer,
	},
	gl: {
		widget: glWidget,
		target: glTarget,
		translation: glServer,
	},
	gu: {
		widget: guWidget,
		target: guTarget,
		translation: guServer,
	},
	he: {
		widget: heWidget,
		target: heTarget,
		translation: heServer,
	},
	hi: {
		widget: hiWidget,
		target: hiTarget,
		translation: hiServer,
	},
	hr: {
		widget: hrWidget,
		target: hrTarget,
		translation: hrServer,
	},
	hu: {
		widget: huWidget,
		target: huTarget,
		translation: huServer,
	},
	hy: {
		widget: hyWidget,
		target: hyTarget,
		translation: hyServer,
	},
	ia: {
		widget: iaWidget,
		target: iaTarget,
		translation: iaServer,
	},
	id: {
		widget: idWidget,
		target: idTarget,
		translation: idServer,
	},
	is: {
		widget: isWidget,
		target: isTarget,
		translation: isServer,
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
	ka: {
		widget: kaWidget,
		target: kaTarget,
		translation: kaServer,
	},
	kk: {
		widget: kkWidget,
		target: kkTarget,
		translation: kkServer,
	},
	km: {
		widget: kmWidget,
		target: kmTarget,
		translation: kmServer,
	},
	kn: {
		widget: knWidget,
		target: knTarget,
		translation: knServer,
	},
	ko: {
		widget: koWidget,
		target: koTarget,
		translation: koServer,
	},
	ky: {
		widget: kyWidget,
		target: kyTarget,
		translation: kyServer,
	},
	lo: {
		widget: loWidget,
		target: loTarget,
		translation: loServer,
	},
	lt: {
		widget: ltWidget,
		target: ltTarget,
		translation: ltServer,
	},
	lv: {
		widget: lvWidget,
		target: lvTarget,
		translation: lvServer,
	},
	mk: {
		widget: mkWidget,
		target: mkTarget,
		translation: mkServer,
	},
	ml: {
		widget: mlWidget,
		target: mlTarget,
		translation: mlServer,
	},
	mn: {
		widget: mnWidget,
		target: mnTarget,
		translation: mnServer,
	},
	mr: {
		widget: mrWidget,
		target: mrTarget,
		translation: mrServer,
	},
	ms: {
		widget: msWidget,
		target: msTarget,
		translation: msServer,
	},
	my: {
		widget: myWidget,
		target: myTarget,
		translation: myServer,
	},
	ne: {
		widget: neWidget,
		target: neTarget,
		translation: neServer,
	},
	nl: {
		widget: nlWidget,
		target: nlTarget,
		translation: nlServer,
	},
	nn: {
		widget: nnWidget,
		target: nnTarget,
		translation: nnServer,
	},
	no: {
		widget: noWidget,
		target: noTarget,
		translation: noServer,
	},
	oc: {
		widget: ocWidget,
		target: ocTarget,
		translation: ocServer,
	},
	or: {
		widget: orWidget,
		target: orTarget,
		translation: orServer,
	},
	pa: {
		widget: paWidget,
		target: paTarget,
		translation: paServer,
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
	rm: {
		widget: rmWidget,
		target: rmTarget,
		translation: rmServer,
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
	sco: {
		widget: scoWidget,
		target: scoTarget,
		translation: scoServer,
	},
	si: {
		widget: siWidget,
		target: siTarget,
		translation: siServer,
	},
	sk: {
		widget: skWidget,
		target: skTarget,
		translation: skServer,
	},
	sl: {
		widget: slWidget,
		target: slTarget,
		translation: slServer,
	},
	sq: {
		widget: sqWidget,
		target: sqTarget,
		translation: sqServer,
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
	sw: {
		widget: swWidget,
		target: swTarget,
		translation: swServer,
	},
	ta: {
		widget: taWidget,
		target: taTarget,
		translation: taServer,
	},
	te: {
		widget: teWidget,
		target: teTarget,
		translation: teServer,
	},
	tg: {
		widget: tgWidget,
		target: tgTarget,
		translation: tgServer,
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
	ur: {
		widget: urWidget,
		target: urTarget,
		translation: urServer,
	},
	uz: {
		widget: uzWidget,
		target: uzTarget,
		translation: uzServer,
	},
	vi: {
		widget: viWidget,
		target: viTarget,
		translation: viServer,
	},
	xh: {
		widget: xhWidget,
		target: xhTarget,
		translation: xhServer,
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
	"zh-HK": {
		widget: zhHkWidget,
		target: zhHkTarget,
		translation: zhHkServer,
	},
	"zh-TW": {
		widget: zhTwWidget,
		target: zhTwTarget,
		translation: zhTwServer,
	},
	zu: {
		widget: zuWidget,
		target: zuTarget,
		translation: zuServer,
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
