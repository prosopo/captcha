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

import type { ProviderApiInterface } from "../api/index.js";
import type { CaptchaSolution } from "../datasets/index.js";
import type { CaptchaResponseBody, RandomProvider } from "../provider/index.js";
import type { TCaptchaSubmitResult } from "./client.js";

export interface ProcaptchaApiInterface {
	userAccount: string;
	provider: RandomProvider;
	providerApi: ProviderApiInterface;
	dappAccount: string;
	web2: boolean;
	submitCaptchaSolution(
		userTimestampSignature: string,
		requestHash: string,
		solutions: CaptchaSolution[],
		timestamp: string,
		providerRequestHashSignature: string,
	): Promise<TCaptchaSubmitResult>;
	getCaptchaChallenge(sessionId?: string): Promise<CaptchaResponseBody>;
}
