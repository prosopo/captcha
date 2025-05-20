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
import { array, number, object, type output, string } from "zod";
import { CaptchaType } from "./captchaType/captchaType.js";
import { CaptchaTypeSpec } from "./captchaType/captchaTypeSpec.js";

export const captchaTypeDefault = CaptchaType.frictionless;
export const domainsDefault: string[] = [];
export const frictionlessThresholdDefault = 0.5;
export const powDifficultyDefault = 4;
export const imageThresholdDefault = 0.8;

export const ClientSettingsSchema = object({
	captchaType: CaptchaTypeSpec.optional().default(captchaTypeDefault),
	domains: array(string())
		.optional()
		.default([...domainsDefault]),
	frictionlessThreshold: number()
		.optional()
		.default(frictionlessThresholdDefault),
	powDifficulty: number().optional().default(powDifficultyDefault),
	imageThreshold: number().default(imageThresholdDefault),
});
export type IUserSettings = output<typeof ClientSettingsSchema>;
