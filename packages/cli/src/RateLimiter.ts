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
import { AdminApiPaths, ApiPaths } from "@prosopo/types";

export const getRateLimitConfig = () => {
	return {
		[ApiPaths.GetImageCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT,
		},
		[ApiPaths.GetPowCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT,
		},
		[ApiPaths.SubmitImageCaptchaSolution]: {
			windowMs: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT,
		},
		[ApiPaths.SubmitPowCaptchaSolution]: {
			windowMs: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_LIMIT,
		},
		[ApiPaths.VerifyPowCaptchaSolution]: {
			windowMs: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_WINDOW,
			limit: process.env.PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT,
		},
		[ApiPaths.VerifyImageCaptchaSolutionDapp]: {
			windowMs: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_WINDOW,
			limit: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_LIMIT,
		},
		[ApiPaths.VerifyImageCaptchaSolutionUser]: {
			windowMs: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_USER_WINDOW,
			limit: process.env.PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_USER_LIMIT,
		},
		[ApiPaths.GetProviderStatus]: {
			windowMs: process.env.PROSOPO_GET_PROVIDER_STATUS_WINDOW,
			limit: process.env.PROSOPO_GET_PROVIDER_STATUS_LIMIT,
		},
		[ApiPaths.GetProviderDetails]: {
			windowMs: process.env.PROSOPO_GET_PROVIDER_DETAILS_WINDOW,
			limit: process.env.PROSOPO_GET_PROVIDER_DETAILS_LIMIT,
		},
		[ApiPaths.SubmitUserEvents]: {
			windowMs: process.env.PROSOPO_SUBMIT_USER_EVENTS_WINDOW,
			limit: process.env.PROSOPO_SUBMIT_USER_EVENTS_LIMIT,
		},
		[AdminApiPaths.UpdateDataset]: {
			windowMs: process.env.PROSOPO_UPDATE_DATASET_WINDOW,
			limit: process.env.PROSOPO_UPDATE_DATASET_LIMIT,
		},
		[AdminApiPaths.SiteKeyRegister]: {
			windowMs: process.env.PROSOPO_SITE_KEY_REGISTER_WINDOW,
			limit: process.env.PROSOPO_SITE_KEY_REGISTER_LIMIT,
		},
		[AdminApiPaths.ProviderDeregister]: {
			windowMs: process.env.PROSOPO_PROVIDER_DEREGISTER_WINDOW,
			limit: process.env.PROSOPO_PROVIDER_DEREGISTER_LIMIT,
		},
		[AdminApiPaths.ProviderUpdate]: {
			windowMs: process.env.PROSOPO_PROVIDER_UPDATE_WINDOW,
			limit: process.env.PROSOPO_PROVIDER_UPDATE_LIMIT,
		},
		[ApiPaths.GetFrictionlessCaptchaChallenge]: {
			windowMs: process.env.PROSOPO_GET_FR_CAPTCHA_CHALLENGE_WINDOW,
			limit: process.env.PROSOPO_GET_FR_CAPTCHA_CHALLENGE_LIMIT,
		},
	};
};
