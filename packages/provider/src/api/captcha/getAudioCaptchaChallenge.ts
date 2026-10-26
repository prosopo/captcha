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
import {
	ApiParams,
	CaptchaType,
	type GetAudioCaptchaResponse,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { resolveAudioRenderSettings } from "../../tasks/audio/audioRenderer.js";
import {
	type ChallengeIssueContext,
	type IssuedChallenge,
	interactiveChallengeHandler,
} from "./interactiveCaptchaChallenge.js";
import { buildAudioMaintenanceResponse } from "./maintenanceModeResponses.js";

const issueAudioChallenge = async ({
	tasks,
	user,
	dapp,
	clientSettings,
	trafficVerdict,
	provenance,
}: ChallengeIssueContext): Promise<
	IssuedChallenge<GetAudioCaptchaResponse>
> => {
	const settings = resolveAudioRenderSettings(
		clientSettings.settings?.audio,
		trafficVerdict.kind === "challenge"
			? trafficVerdict.audioSettings
			: undefined,
	);
	const challenge = tasks.audioCaptchaManager.getAudioCaptchaChallenge(
		user,
		dapp,
		settings,
	);

	// Stored before responding, so the user never hears a clip the server
	// cannot score.
	await tasks.db.storeAudioCaptchaRecord(
		challenge.challenge,
		{
			requestedAtTimestamp: challenge.requestedAtTimestamp,
			userAccount: user,
			dappAccount: dapp,
		},
		challenge.answer,
		challenge.providerSignature,
		provenance.ipAddress,
		provenance.headers,
		provenance.ja4,
		provenance.sessionId,
		provenance.ipInfo,
	);

	return {
		logData: {
			characterCount: challenge.characterCount,
			durationMs: challenge.durationMs,
		},
		response: {
			[ApiParams.status]: "ok",
			[ApiParams.challenge]: challenge.challenge,
			[ApiParams.clip]: challenge.clip,
			[ApiParams.characterCount]: challenge.characterCount,
			[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.challenge]: challenge.providerSignature,
				},
			},
		},
	};
};

// `isValidRequest` refuses audio unless the site has it on, and requires a
// visual session to exchange; see `isAudioAlternativeEnabled` and
// `isAudioAlternativeAllowed`.
export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	interactiveChallengeHandler(env, userAccessRulesStorage, {
		captchaType: CaptchaType.audio,
		label: "audio",
		manager: (tasks) => tasks.audioCaptchaManager,
		maintenanceResponse: buildAudioMaintenanceResponse,
		issue: issueAudioChallenge,
	});
