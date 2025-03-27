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
import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";

export const getRateLimitConfig = () => {
	return {
		[ClientApiPaths.GetImageCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT,
		},
		[ClientApiPaths.GetPowCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT,
		},
		[ClientApiPaths.GetSliderCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_SLIDER_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_SLIDER_CAPTCHA_CHALLENGE_LIMIT,
		},
		[ClientApiPaths.SubmitImageCaptchaSolution]: {
			windowMs: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT,
		},
		[ClientApiPaths.SubmitPowCaptchaSolution]: {
			windowMs: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_LIMIT,
		},
		[ClientApiPaths.SubmitSliderCaptchaSolution]: {
			windowMs: process.env.PROSOPO_SUBMIT_SLIDER_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_SLIDER_CAPTCHA_SOLUTION_LIMIT,
		},
		[ClientApiPaths.VerifyPowCaptchaSolution]: {
			windowMs: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT,
		},
		[ClientApiPaths.VerifySliderCaptchaSolution]: {
			windowMs: process.env.PROSOPO_VERIFY_SLIDER_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_VERIFY_SLIDER_CAPTCHA_SOLUTION_LIMIT,
		},
		[ClientApiPaths.VerifyImageCaptchaSolutionDapp]: {
			windowMs: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_WINDOW,
			limit: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_LIMIT,
		},
		[ClientApiPaths.GetProviderStatus]: {
			windowMs: process.env.PROSOPO_GET_PROVIDER_STATUS_WINDOW,
			limit: process.env.PROSOPO_GET_PROVIDER_STATUS_LIMIT,
		},
		[PublicApiPaths.GetProviderDetails]: {
			windowMs: process.env.PROSOPO_GET_PROVIDER_DETAILS_WINDOW,
			limit: process.env.PROSOPO_GET_PROVIDER_DETAILS_LIMIT,
		},
		[ClientApiPaths.SubmitUserEvents]: {
			windowMs: process.env.PROSOPO_SUBMIT_USER_EVENTS_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_USER_EVENTS_LIMIT,
		},
		[AdminApiPaths.SiteKeyRegister]: {
			windowMs: process.env.PROSOPO_SITE_KEY_REGISTER_WINDOW,
			limit: process.env.PROSOPO_SITE_KEY_REGISTER_LIMIT,
		},
		[AdminApiPaths.UpdateDetectorKey]: {
			windowMs: process.env.PROSOPO_UPDATE_DETECTOR_KEY_WINDOW,
			limit: process.env.PROSOPO_UPDATE_DETECTOR_KEY_LIMIT,
		},
		[AdminApiPaths.RemoveDetectorKey]: {
			windowMs: process.env.PROSOPO_REMOVE_DETECTOR_KEY_WINDOW,
			limit: process.env.PROSOPO_REMOVE_DETECTOR_KEY_LIMIT,
		},
		[ClientApiPaths.GetFrictionlessCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_FR_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_FR_CAPTCHA_CHALLENGE_LIMIT,
		},
	};
};
