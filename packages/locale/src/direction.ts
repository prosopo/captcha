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

export type TextDirection = "ltr" | "rtl";

// CLDR 48: the scripts are every ISO 15924 code Node 24's ICU 78.3 reports
// as right to left; the languages and regions come from cldr-core 48.0.0's
// likelySubtags.json and aliases.json. They cover every right-to-left
// language whether or not we have a catalogue for it, so adding one needs no
// change here. direction.unit.test.ts checks them against Intl and names any
// language a newer CLDR adds or moves.
const words = (list: string): ReadonlySet<string> => new Set(list.split(" "));

const RTL_SCRIPTS = words(
	"adlm arab armi avst chrs cprt elym gara hatr hebr hung khar lydi " +
		"mand mani mend merc mero narb nbat nkoo orkh ougr palm phli phlp " +
		"phnx prti rohg samr sarb sidt sogd sogo syrc thaa yezi",
);

// Languages whose likely script is right to left, and the deprecated and
// three-letter codes that alias them (iw, heb, per, and prs, drw, tnf
// for Dari, which ICU canonicalises to fa-AF).
const RTL_LANGUAGES = words(
	"aao abh abv acm acq acw acx adf ae aeb aec aee aeq afb aib aii aij " +
		"aiq ajp ajt aju amw apc apd ar ara arb arc arq ars ary arz ask atn " +
		"auj auz avd ave avl ayh ayl ayn ayp azb bal bcc bdz bej bft bgn " +
		"bgp bhe bhm bhn bjf bjm bqi brh brk bsh bsk chg cja ckb cld clh " +
		"czk dcc def deh dgl div dmk dml drw dv ecy esh fa fas fay faz fia " +
		"fub gbz ggg gha ghr gig gjk gju glh glk grr gwc gwf gwt gzi hac " +
		"haz hbo he heb hkh hnd hno hoh hrt hrz hss huy isk itk iw jad jat " +
		"jbe jbn jdg ji jnd jog jpa jpr jrb jye kas kbu kby kcy kfm khw klj " +
		"kmz kqd ks ktl kvx kxp kzh lad lah lhs lki lrc lrk lrl lsa lsd lss " +
		"luv luz mby mde mey mfa mfi mhj mid mki mnj mve mvy myz mzb mzn " +
		"nli nlm nqo ntz nyq oar obm odk oru ota otk oui pal pbt pbu per " +
		"pes pgd phl phn phr phv plk pmu pnb prc prd prs prx ps psh psi pst " +
		"pus qxq rdb rhg rmt sam sbn scl sd sdb sdf sdg sdh sds sgl sgr sgy " +
		"shd shm shu shv siy siz skr smp smy snd sog sqo sqt srh srz ssh " +
		"sts swb syc syn syr tjo tks tmr tnf tov tra trg trm trw ug uig ur " +
		"urd ush uzs vaf vgr vmh wbk wlo wne wni wsv xco xhe xka xkc xkj " +
		"xkp xld xly xmn xmr xna xpr xsa xsd xvi ydd ydg yhd yi yid yih yud " +
		"zba zdj zrp zum",
);

// Languages written left to right except in these regions, where CLDR's likely
// script is Arabic (pa-PK, uz-AF, ...).
const RTL_LANGUAGE_REGIONS = words(
	"az-iq az-ir ha-cm ha-sd kk-af kk-cn kk-ir kk-mn ku-iq ku-ir ku-lb " +
		"ky-cn ms-cc pa-pk tg-pk uz-af",
);

interface TextInfo {
	readonly direction?: string;
}

// Intl.Locale's text info, which TypeScript's lib does not declare yet. Older
// engines expose it as the `textInfo` accessor.
interface LocaleTextInfo {
	readonly getTextInfo?: () => TextInfo;
	readonly textInfo?: TextInfo;
}

const isRtlByIntl = (tag: string): boolean => {
	try {
		const locale: Intl.Locale & LocaleTextInfo = new Intl.Locale(tag);
		const info: TextInfo | undefined =
			typeof locale.getTextInfo === "function"
				? locale.getTextInfo()
				: locale.textInfo;
		return info?.direction === "rtl";
	} catch {
		return false;
	}
};

const SCRIPT_SUBTAG = /^[a-z]{4}$/;
const REGION_SUBTAG = /^([a-z]{2}|[0-9]{3})$/;

const isRtlByList = (tag: string): boolean => {
	const [language = "", ...subtags] = tag.toLowerCase().split(/[-_]/);
	const extensionStart = subtags.findIndex(
		(subtag: string) => subtag.length === 1,
	);
	const own =
		extensionStart === -1 ? subtags : subtags.slice(0, extensionStart);
	const script = own.find((subtag: string) => SCRIPT_SUBTAG.test(subtag));
	if (script) {
		return RTL_SCRIPTS.has(script);
	}
	const region = own.find((subtag: string) => REGION_SUBTAG.test(subtag));
	return (
		RTL_LANGUAGES.has(language) ||
		(region !== undefined && RTL_LANGUAGE_REGIONS.has(`${language}-${region}`))
	);
};

/**
 * The direction a BCP 47 tag is written in. Right to left if our CLDR lists
 * say so or the browser's Intl does: the lists give every browser the same
 * answer for the languages they know, and Intl covers languages CLDR adds
 * after them. An explicit script wins over the language and region (`pa-Arab`
 * is rtl, `az-Latn-IR` ltr).
 */
export const getLanguageDirection = (language: string): TextDirection =>
	isRtlByList(language) || isRtlByIntl(language) ? "rtl" : "ltr";
