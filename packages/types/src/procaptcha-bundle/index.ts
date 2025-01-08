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

import type { LanguageSchema } from "@prosopo/locale";
import type { ProcaptchaToken } from "@prosopo/types";

export enum FeaturesEnum {
	Image = "image",
	Pow = "pow",
	Frictionless = "frictionless",
}

export type Features = `${FeaturesEnum}`;

export interface ProcaptchaRenderOptions {
	siteKey: string;
	theme?: "light" | "dark";
	captchaType?: Features;
	callback?: string | ((token: ProcaptchaToken) => void);
	"challenge-valid-length"?: string; // seconds for successful challenge to be valid
	"chalexpired-callback"?: string | (() => void);
	"expired-callback"?: string | (() => void);
	"open-callback"?: string | (() => void);
	"close-callback"?: string | (() => void);
	"error-callback"?: string | (() => void);
	"failed-callback"?: string | (() => void);
	"reset-callback"?: string | (() => void);
	language?: typeof LanguageSchema;
}
