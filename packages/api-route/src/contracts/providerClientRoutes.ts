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
	AssignDetectorBundleRequestBody,
	type AssignDetectorBundleResponse,
	type AudioCaptchaSolutionResponse,
	CaptchaRequestBody,
	type CaptchaResponseBody,
	CaptchaSolutionBody,
	type CaptchaSolutionResponse,
	CheckSpamEmailRequestBody,
	type CheckSpamEmailResponse,
	ClientApiPaths,
	type GetAudioCaptchaResponse,
	GetFrictionlessCaptchaChallengeRequestBody,
	type GetFrictionlessCaptchaResponse,
	type GetIconOrderCaptchaResponse,
	GetPowCaptchaChallengeRequestBody,
	type GetPowCaptchaResponse,
	GetPuzzleCaptchaChallengeRequestBody,
	type GetPuzzleCaptchaResponse,
	type IconOrderCaptchaSolutionResponse,
	type ImageVerificationResponse,
	type PowCaptchaSolutionResponse,
	type PuzzleCaptchaSolutionResponse,
	ServerPowCaptchaVerifyRequestBody,
	ServerPuzzleCaptchaVerifyRequestBody,
	SubmitAudioCaptchaSolutionBody,
	SubmitIconOrderCaptchaSolutionBody,
	SubmitPowCaptchaSolutionBody,
	SubmitPuzzleCaptchaSolutionBody,
	type VerificationResponse,
	VerifySolutionBody,
} from "@prosopo/types";
import { type ZodType, z } from "zod";
import { type ApiRouteContract, defineApiRoute } from "../apiRouteContract.js";

// Response bodies are declared with z.custom: the provider builds them as
// interfaces with no zod schema, so these carry the type without validating.

export const getImageCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetImageCaptchaChallenge,
	typeof CaptchaRequestBody,
	ZodType<CaptchaResponseBody>
> = defineApiRoute({
	path: ClientApiPaths.GetImageCaptchaChallenge,
	method: "post",
	requestSchema: CaptchaRequestBody,
	responseSchema: z.custom<CaptchaResponseBody>(),
});

export const submitImageCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.SubmitImageCaptchaSolution,
	typeof CaptchaSolutionBody,
	ZodType<CaptchaSolutionResponse>
> = defineApiRoute({
	path: ClientApiPaths.SubmitImageCaptchaSolution,
	method: "post",
	requestSchema: CaptchaSolutionBody,
	responseSchema: z.custom<CaptchaSolutionResponse>(),
});

export const getPowCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetPowCaptchaChallenge,
	typeof GetPowCaptchaChallengeRequestBody,
	ZodType<GetPowCaptchaResponse>
> = defineApiRoute({
	path: ClientApiPaths.GetPowCaptchaChallenge,
	method: "post",
	requestSchema: GetPowCaptchaChallengeRequestBody,
	responseSchema: z.custom<GetPowCaptchaResponse>(),
});

export const submitPowCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.SubmitPowCaptchaSolution,
	typeof SubmitPowCaptchaSolutionBody,
	ZodType<PowCaptchaSolutionResponse>
> = defineApiRoute({
	path: ClientApiPaths.SubmitPowCaptchaSolution,
	method: "post",
	requestSchema: SubmitPowCaptchaSolutionBody,
	responseSchema: z.custom<PowCaptchaSolutionResponse>(),
});

export const getFrictionlessCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetFrictionlessCaptchaChallenge,
	typeof GetFrictionlessCaptchaChallengeRequestBody,
	ZodType<GetFrictionlessCaptchaResponse>
> = defineApiRoute({
	path: ClientApiPaths.GetFrictionlessCaptchaChallenge,
	method: "post",
	requestSchema: GetFrictionlessCaptchaChallengeRequestBody,
	responseSchema: z.custom<GetFrictionlessCaptchaResponse>(),
});

export const assignDetectorBundleRoute: ApiRouteContract<
	ClientApiPaths.AssignDetectorBundle,
	typeof AssignDetectorBundleRequestBody,
	ZodType<AssignDetectorBundleResponse>
> = defineApiRoute({
	path: ClientApiPaths.AssignDetectorBundle,
	method: "post",
	requestSchema: AssignDetectorBundleRequestBody,
	responseSchema: z.custom<AssignDetectorBundleResponse>(),
});

export const getPuzzleCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetPuzzleCaptchaChallenge,
	typeof GetPuzzleCaptchaChallengeRequestBody,
	ZodType<GetPuzzleCaptchaResponse>
> = defineApiRoute({
	path: ClientApiPaths.GetPuzzleCaptchaChallenge,
	method: "post",
	requestSchema: GetPuzzleCaptchaChallengeRequestBody,
	responseSchema: z.custom<GetPuzzleCaptchaResponse>(),
});

export const submitPuzzleCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.SubmitPuzzleCaptchaSolution,
	typeof SubmitPuzzleCaptchaSolutionBody,
	ZodType<PuzzleCaptchaSolutionResponse>
> = defineApiRoute({
	path: ClientApiPaths.SubmitPuzzleCaptchaSolution,
	method: "post",
	requestSchema: SubmitPuzzleCaptchaSolutionBody,
	responseSchema: z.custom<PuzzleCaptchaSolutionResponse>(),
});

export const getAudioCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetAudioCaptchaChallenge,
	typeof GetPuzzleCaptchaChallengeRequestBody,
	ZodType<GetAudioCaptchaResponse>
> = defineApiRoute({
	path: ClientApiPaths.GetAudioCaptchaChallenge,
	method: "post",
	requestSchema: GetPuzzleCaptchaChallengeRequestBody,
	responseSchema: z.custom<GetAudioCaptchaResponse>(),
});

export const submitAudioCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.SubmitAudioCaptchaSolution,
	typeof SubmitAudioCaptchaSolutionBody,
	ZodType<AudioCaptchaSolutionResponse>
> = defineApiRoute({
	path: ClientApiPaths.SubmitAudioCaptchaSolution,
	method: "post",
	requestSchema: SubmitAudioCaptchaSolutionBody,
	responseSchema: z.custom<AudioCaptchaSolutionResponse>(),
});

export const getIconOrderCaptchaChallengeRoute: ApiRouteContract<
	ClientApiPaths.GetIconOrderCaptchaChallenge,
	typeof GetPuzzleCaptchaChallengeRequestBody,
	ZodType<GetIconOrderCaptchaResponse>
> = defineApiRoute({
	path: ClientApiPaths.GetIconOrderCaptchaChallenge,
	method: "post",
	requestSchema: GetPuzzleCaptchaChallengeRequestBody,
	responseSchema: z.custom<GetIconOrderCaptchaResponse>(),
});

export const submitIconOrderCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.SubmitIconOrderCaptchaSolution,
	typeof SubmitIconOrderCaptchaSolutionBody,
	ZodType<IconOrderCaptchaSolutionResponse>
> = defineApiRoute({
	path: ClientApiPaths.SubmitIconOrderCaptchaSolution,
	method: "post",
	requestSchema: SubmitIconOrderCaptchaSolutionBody,
	responseSchema: z.custom<IconOrderCaptchaSolutionResponse>(),
});

export const checkSpamEmailRoute: ApiRouteContract<
	ClientApiPaths.CheckSpamEmail,
	typeof CheckSpamEmailRequestBody,
	ZodType<CheckSpamEmailResponse>
> = defineApiRoute({
	path: ClientApiPaths.CheckSpamEmail,
	method: "post",
	requestSchema: CheckSpamEmailRequestBody,
	responseSchema: z.custom<CheckSpamEmailResponse>(),
});

export const verifyImageCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.VerifyImageCaptchaSolutionDapp,
	typeof VerifySolutionBody,
	ZodType<ImageVerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyImageCaptchaSolutionDapp,
	method: "post",
	requestSchema: VerifySolutionBody,
	responseSchema: z.custom<ImageVerificationResponse>(),
});

export const verifyPowCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.VerifyPowCaptchaSolution,
	typeof ServerPowCaptchaVerifyRequestBody,
	ZodType<VerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyPowCaptchaSolution,
	method: "post",
	requestSchema: ServerPowCaptchaVerifyRequestBody,
	responseSchema: z.custom<VerificationResponse>(),
});

export const verifyPuzzleCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.VerifyPuzzleCaptchaSolution,
	typeof ServerPuzzleCaptchaVerifyRequestBody,
	ZodType<VerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyPuzzleCaptchaSolution,
	method: "post",
	requestSchema: ServerPuzzleCaptchaVerifyRequestBody,
	responseSchema: z.custom<VerificationResponse>(),
});

export const verifyAudioCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.VerifyAudioCaptchaSolution,
	typeof ServerPuzzleCaptchaVerifyRequestBody,
	ZodType<VerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyAudioCaptchaSolution,
	method: "post",
	requestSchema: ServerPuzzleCaptchaVerifyRequestBody,
	responseSchema: z.custom<VerificationResponse>(),
});

export const verifyIconOrderCaptchaSolutionRoute: ApiRouteContract<
	ClientApiPaths.VerifyIconOrderCaptchaSolution,
	typeof ServerPuzzleCaptchaVerifyRequestBody,
	ZodType<VerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyIconOrderCaptchaSolution,
	method: "post",
	requestSchema: ServerPuzzleCaptchaVerifyRequestBody,
	responseSchema: z.custom<VerificationResponse>(),
});

export const verifyAuthenticatedSessionRoute: ApiRouteContract<
	ClientApiPaths.VerifyAuthenticatedSession,
	typeof VerifySolutionBody,
	ZodType<VerificationResponse>
> = defineApiRoute({
	path: ClientApiPaths.VerifyAuthenticatedSession,
	method: "post",
	requestSchema: VerifySolutionBody,
	responseSchema: z.custom<VerificationResponse>(),
});
