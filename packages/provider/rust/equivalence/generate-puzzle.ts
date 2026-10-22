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

// Writes puzzle-vectors.json: the deterministic parts of the puzzle challenge, from the TS on
// Node 24. `deriveMobileVerdict` over user agents, client hints and the corroborating
// signals, with the characters JS case-insensitive matching treats differently from Unicode
// case folding; `resolvePuzzleRenderSettings` with the decoy-hole floor; the piece-scale range
// with inverted overrides; and whether a site offers the image switch.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isPuzzleImageSwitchAvailable } from "../../src/api/captcha/getFrictionlessCaptchaChallenge/constants.js";
import {
	resolvePuzzlePieceScaleRange,
	resolvePuzzleRenderSettings,
} from "../../src/tasks/puzzle/puzzleRenderer.js";
import {
	type MobileSignals,
	deriveMobileVerdict,
} from "../../src/utils/mobileSignals.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const userAgents: (string | undefined)[] = [
	undefined,
	"",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
	"Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/119 Mobile Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
	"Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Firefox/135.0",
	"Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) Chrome/119",
	"MOBILE ANDROID",
	"opera mini",
	"Mozilla/5.0 (Macintoſh; Intel)",
	"Mozilla/5.0 (Windows NT; Mobıle)",
	"ipad and windows nt",
	"Ⅹ11 KHTML",
	"IEMobile/11.0",
];
const headerSets: (Record<string, unknown> | undefined)[] = [
	undefined,
	{},
	{ "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": '"Android"' },
	{ "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"' },
	{ "sec-ch-ua-platform": "iOS" },
	{ "sec-ch-ua-platform": '"İOS"' },
	{ "sec-ch-ua-platform": '"Chrome OS"' },
	{ "sec-ch-ua-platform": '""macOS""' },
	{ "sec-ch-ua-platform": "Linux " },
	{ "sec-ch-ua-platform": 'And"roid' },
	{ "sec-ch-ua-mobile": "", "sec-ch-ua-platform": "" },
	{ "sec-ch-ua-mobile": "?2" },
	{ "sec-ch-ua-mobile": ["?1"], "sec-ch-ua-platform": ["Android"] },
];
const extras: Partial<MobileSignals>[] = [
	{},
	{ carrierNetwork: true },
	{ carrierNetwork: false, tcpMss: 1460 },
	{ tcpMss: 1300 },
	{ tcpMss: 1430 },
	{ tcpMss: 1299.5 },
	{ tcpMss: 1430.5 },
	{ carrierNetwork: true, tcpMss: 1400 },
	{ webView: true },
	{ webView: false },
	{ deviceCapability: "mobile" },
	{ deviceCapability: "desktop" },
	{ deviceCapability: "Mobile" },
	{ touchEventCount: 0 },
	{ touchEventCount: 3 },
	{ touchEventCount: -1 },
	{
		deviceCapability: "mobile",
		touchEventCount: 12,
		webView: true,
		carrierNetwork: true,
	},
];

const mobile: Json[] = [];
for (const userAgent of userAgents) {
	for (const headers of headerSets) {
		for (const extra of extras) {
			const signals = {
				...(userAgent !== undefined && { userAgent }),
				...(headers && { headers }),
				...extra,
			} as MobileSignals;
			mobile.push({
				signals: signals as unknown as Json,
				verdict: deriveMobileVerdict(signals) as unknown as Json,
			});
		}
	}
}

const puzzleOverrides: (Record<string, unknown> | undefined)[] = [
	undefined,
	{},
	{ decoyCount: 3 },
	{ holeDarken: 0.9 },
	{ holeDarken: 0.98, decoyHoleDarken: 0.1 },
	{ decoyHoleDarken: 0.2, decoyEdgeDarkness: 0.3, decoyBodyBrightness: 0.6 },
	{ holeDarken: 0.5, decoyHoleDarken: 0.52 },
	{ pieceScale: { min: 0.3 } },
	{ pieceScale: { max: 0.1 } },
	{ pieceScale: { min: 0.2, max: 0.25 } },
	{ pieceScale: {} },
	{ pieceScale: 0.3 as never },
	{ decoyCount: 0, pieceScale: { min: 0.5, max: 0.4 } },
];
const render: Json[] = [];
const scale: Json[] = [];
for (const site of puzzleOverrides) {
	for (const routed of puzzleOverrides) {
		render.push({
			site: (site ?? null) as Json,
			routed: (routed ?? null) as Json,
			resolved: resolvePuzzleRenderSettings(
				site as never,
				routed as never,
			) as unknown as Json,
		});
		scale.push({
			site: (site ?? null) as Json,
			routed: (routed ?? null) as Json,
			resolved: resolvePuzzlePieceScaleRange(
				site as never,
				routed as never,
			) as unknown as Json,
		});
	}
}

const switchSettings: Record<string, unknown>[] = [
	{},
	{ widgetFeatureFlags: { puzzleImageSwitch: true } },
	{ widgetFeatureFlags: { puzzleImageSwitch: false } },
	{
		widgetFeatureFlags: { puzzleImageSwitch: true },
		captchaType: "frictionless",
		frictionlessTypes: { image: false },
	},
	{
		widgetFeatureFlags: { puzzleImageSwitch: true },
		captchaType: "puzzle",
		frictionlessTypes: { image: false },
	},
	{
		widgetFeatureFlags: { puzzleImageSwitch: true },
		frictionlessTypes: { image: true, puzzle: false },
	},
	{ widgetFeatureFlags: { puzzleImageSwitch: true }, captchaType: "image" },
	{ widgetFeatureFlags: {}, captchaType: "frictionless" },
	{
		widgetFeatureFlags: { puzzleImageSwitch: true },
		captchaType: "",
		frictionlessTypes: { image: false },
	},
];
const imageSwitch: Json[] = switchSettings.map((settings) => ({
	settings: settings as Json,
	available: isPuzzleImageSwitchAvailable(settings as never),
}));

const out = fileURLToPath(new URL("puzzle-vectors.json", import.meta.url));
writeFileSync(
	out,
	`${JSON.stringify({ mobile, render, scale, imageSwitch })}\n`,
);
console.log(
	`wrote ${mobile.length} verdicts, ${render.length} render settings, ${imageSwitch.length} switch cases to ${out}`,
);
