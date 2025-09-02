import { ProviderApi } from "@prosopo/api";
import { loadBalancer } from "@prosopo/load-balancer";
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
import {
	type CaptchaType,
	ClientSettingsSchema,
	EnvironmentTypesSchema,
	type KeyringPair,
	Tier,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";

export const registerSiteKey = async (
	siteKey: string,
	captchaType: CaptchaType,
	adminPair: KeyringPair,
): Promise<void> => {
	try {
		const providers = await loadBalancer(
			EnvironmentTypesSchema.enum.development,
		);
		for (const provider of providers) {
			const providerApi = new ProviderApi(provider.url, adminPair.address);

			const response = await providerApi.registerSiteKey(
				siteKey,
				Tier.Free,
				ClientSettingsSchema.parse({
					captchaType,
					domains: ["localhost", "0.0.0.0", "127.0.0.0", "example.com"],
					frictionlessThreshold: 0.5,
					powDifficulty: 4,
				}),
				adminPair.jwtIssue(),
			);
		}
	} catch (err) {
		throw new Error(`Failed to register site key: ${err}`);
	}
};
