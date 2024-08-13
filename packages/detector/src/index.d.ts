// Copyright 2021-2024 Prosopo (UK) Ltd.
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
export function isBot(): Promise<{
	fingerprint: {
		resistance:
			| {
					privacy: undefined;
					security: undefined;
					mode: undefined;
					extension: undefined;
					// biome-ignore lint/suspicious/noExplicitAny: TODO fix
					engine: any;
			  }
			| undefined;
		headlessFeaturesFingerprint:
			| {
					likeHeadlessRating: number;
					headlessRating: number;
					stealthRating: number;
					systemFonts: string;
					// biome-ignore lint/suspicious/noExplicitAny: TODO fix
					platformEstimate: any[];
					chromium: boolean;
					likeHeadless: {
						noChrome: boolean;
						hasPermissionsBug: boolean;
						noPlugins: boolean;
						noMimeTypes: boolean;
						notificationIsDenied: boolean;
						hasKnownBgColor: boolean;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						prefersLightColor: any;
						uaDataIsBlank: boolean;
						pdfIsDisabled: boolean;
						noTaskbar: boolean;
						hasVvpScreenRes: boolean;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						hasSwiftShader: any;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						noWebShare: any;
						noContentIndex: boolean;
						noContactsManager: boolean;
						noDownlinkMax: boolean;
					};
					headless: {
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						webDriverIsOn: any;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						hasHeadlessUA: any;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						hasHeadlessWorkerUA: any;
					};
					stealth: {
						hasIframeProxy: boolean;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						hasHighChromeIndex: any;
						hasBadChromeRuntime: boolean;
						hasToStringProxy: boolean;
						// biome-ignore lint/suspicious/noExplicitAny: TODO fix
						hasBadWebGL: any;
					};
			  }
			| undefined;
	};
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	isBotBotD: any;
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	botScore: any;
	isBot: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	botType: any;
}>;
export function getFingerprint(): Promise<string>;
//# sourceMappingURL=index.d.ts.map
