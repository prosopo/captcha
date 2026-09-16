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
//sr25519 dev site keys
import {
	CaptchaType,
	ClientSettingsSchema,
	type IProviderAccount,
	type ISite,
} from "@prosopo/types";
import { DEV_PHRASE } from "../keyring/index.js";
import { getPair } from "./getPair.js";

/**
 * One dev site. `name` is the suffix its key is derived from, and matches the
 * `PROSOPO_SITE_KEY_<NAME>` variable the demos read.
 */
interface SiteKeySeed {
	name: string;
	captchaType: CaptchaType;
	audioAccessibilityEnabled: boolean;
}

const seed = (
	captchaType: CaptchaType,
	name: string = captchaType,
	audioAccessibilityEnabled = false,
): SiteKeySeed => ({ name, captchaType, audioAccessibilityEnabled });

export function getDefaultSiteKeys(): ISite[] {
	const seeds: SiteKeySeed[] = [
		seed(CaptchaType.image),
		seed(CaptchaType.pow),
		seed(CaptchaType.frictionless),
		// Ordered before `puzzle` deliberately. `updateDemoHTMLFiles` rewrites
		// the sitekey in EVERY demo HTML file once per seeded type, so whichever
		// type is seeded last is the one left in the webview demos. Appending
		// here would silently repoint them from puzzle to icon-order.
		seed(CaptchaType.iconOrder),
		// The audio demos' key. Audio is not a type a site can select — it is
		// only the accessibility alternative a user picks from a visual
		// challenge — so this is an image site with that alternative on. The
		// `audio` name keeps the derived key, and PROSOPO_SITE_KEY_AUDIO, stable.
		// Before `puzzle` for the same reason as icon-order.
		seed(CaptchaType.image, "audio", true),
		seed(CaptchaType.puzzle),
	];
	const sites: ISite[] = [];
	for (const { name, captchaType, audioAccessibilityEnabled } of seeds) {
		const secret = `${DEV_PHRASE}//${name}`;
		const pair = getPair(secret);
		// Settings are written explicitly rather than relying on schema defaults
		// so dev seeds are self-describing and stay stable when defaults change.
		sites.push({
			pair: pair,
			address: pair.address,
			secret: secret,
			settings: ClientSettingsSchema.parse({
				captchaType: captchaType,
				audioAccessibilityEnabled,
				domains: ["localhost"],
				imageMaxRounds: 2,
				frictionlessThreshold: 0.8,
			}),
		});
	}
	return sites;
}

export function getDefaultProviders(): IProviderAccount[] {
	const pair = getPair(
		"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
	);
	return [
		{
			url: "https://localhost:9229",
			pair: pair,
			address: pair.address,
			datasetFile: "./dev/data/captchas.json",
			captchaDatasetId:
				"0x3e067b8f6aeae82fdbe2b2557b9c2d90aaabff241df651bf0f36667d2ab0018d",
		},
	];
}
