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
//sr25519 dev site keys
import {
	CaptchaType,
	ClientSettingsSchema,
	type IProviderAccount,
	type ISite,
} from "@prosopo/types";
import { DEV_PHRASE } from "../keyring/index.js";
import { getPair } from "./getPair.js";

export function getDefaultSiteKeys(): ISite[] {
	const captchaTypes = [
		CaptchaType.image,
		CaptchaType.pow,
		CaptchaType.frictionless,
		CaptchaType.invisible,
	];
	const sites: ISite[] = [];
	for (const captchaType of captchaTypes) {
		const secret = `${DEV_PHRASE}//${captchaType}`;
		const pair = getPair(secret);
		sites.push({
			pair: pair,
			address: pair.address,
			secret: secret,
			settings: ClientSettingsSchema.parse({
				captchaType: captchaType,
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
			url: "http://localhost:9229",
			pair: pair,
			address: pair.address,
			datasetFile: "./dev/data/captchas.json",
			captchaDatasetId:
				"0x3e067b8f6aeae82fdbe2b2557b9c2d90aaabff241df651bf0f36667d2ab0018d",
		},
	];
}
