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
	type GetIconOrderCaptchaResponse,
	resolveFrictionlessTypes,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import {
	renderIconOrderImages,
	resolveIconOrderRenderSettings,
} from "../../tasks/iconOrder/iconOrderRenderer.js";
import {
	type ChallengeIssueContext,
	type IssuedChallenge,
	interactiveChallengeHandler,
} from "./interactiveCaptchaChallenge.js";
import { buildIconOrderMaintenanceResponse } from "./maintenanceModeResponses.js";

const issueIconOrderChallenge = async ({
	tasks,
	user,
	dapp,
	clientSettings,
	sessionRecord,
	trafficVerdict,
	provenance,
}: ChallengeIssueContext): Promise<
	IssuedChallenge<GetIconOrderCaptchaResponse>
> => {
	const challengeVerdict =
		trafficVerdict.kind === "challenge" ? trafficVerdict : undefined;
	// Same precedence as the puzzle type: live traffic-filter verdict, then
	// routing-machine overrides on the session, then the site's settings.
	const tolerance =
		challengeVerdict?.iconOrderTolerance ??
		sessionRecord?.iconOrderTolerance ??
		clientSettings?.settings?.iconOrderTolerance;
	const renderSettings = resolveIconOrderRenderSettings(
		clientSettings?.settings?.iconOrder,
		challengeVerdict?.iconOrderSettings ?? sessionRecord?.iconOrder,
	);

	const challenge =
		await tasks.iconOrderCaptchaManager.getIconOrderCaptchaChallenge(
			user,
			dapp,
			tolerance,
			() => renderIconOrderImages(renderSettings),
		);

	// Stored before responding, so the user never sees a frame the server
	// cannot score.
	await tasks.db.storeIconOrderCaptchaRecord(
		challenge.challenge,
		{
			requestedAtTimestamp: challenge.requestedAtTimestamp,
			userAccount: user,
			dappAccount: dapp,
		},
		challenge.targets,
		challenge.tolerance,
		challenge.providerSignature,
		provenance.ipAddress,
		provenance.headers,
		provenance.ja4,
		provenance.sessionId,
		provenance.ipInfo,
	);

	return {
		tolerance: challenge.tolerance,
		response: {
			[ApiParams.status]: "ok",
			[ApiParams.challenge]: challenge.challenge,
			[ApiParams.background]: challenge.images.background,
			[ApiParams.legend]: challenge.images.legend,
			[ApiParams.legendIconSize]: challenge.images.legendIconSize,
			[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.challenge]: challenge.providerSignature,
				},
			},
		},
	};
};

export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	interactiveChallengeHandler(env, userAccessRulesStorage, {
		captchaType: CaptchaType.iconOrder,
		label: "icon-order",
		manager: (tasks) => tasks.iconOrderCaptchaManager,
		maintenanceResponse: buildIconOrderMaintenanceResponse,
		isEnabled: (settings) =>
			resolveFrictionlessTypes(settings?.frictionlessTypes).iconOrder,
		issue: issueIconOrderChallenge,
	});
