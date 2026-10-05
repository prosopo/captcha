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

/** `name` derives the key and matches the demos' `PROSOPO_SITE_KEY_<NAME>`. */
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
		// Before `puzzle`: `updateDemoHTMLFiles` leaves the last-seeded type's
		// sitekey in the webview demos, which must stay puzzle.
		seed(CaptchaType.iconOrder),
		// Audio is not selectable, so the audio demos' key is an image site
		// with the alternative on.
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
				...(captchaType === CaptchaType.iconOrder && {
					captchaTypeFeatureFlags: { iconOrder: true },
				}),
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
