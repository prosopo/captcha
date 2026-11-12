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
import { SubmitAudioCaptchaSolutionBody } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress } from "@prosopo/util";
import { interactiveSolutionHandler } from "./interactiveCaptchaSolution.js";

export default (env: ProviderEnvironment) =>
	interactiveSolutionHandler(env, {
		label: "audio",
		parse: (body) => SubmitAudioCaptchaSolutionBody.parse(body),
		verify: async (tasks, body, submitWindowMs, req) => ({
			verified: await tasks.audioCaptchaManager.verifyAudioCaptchaSolution({
				challenge: body.challenge,
				providerChallengeSignature: body.signature.provider.challenge,
				submittedAnswer: body.answer,
				replays: body.replays ?? 0,
				audioEvents: body.audioEvents ?? [],
				timeout: submitWindowMs,
				userTimestampSignature: body.signature.user.timestamp,
				ipAddress: getIPAddress(req.ip || ""),
				behavioralData: body.behavioralData,
				salt: body.salt,
				simdReadings: body.simdReadings,
				clientMetaData: body.clientMetaData,
			}),
		}),
	});
