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
/**
 * Procaptcha configuration options
 */
export interface ProcaptchaConfig {
	/**
	 * Your Prosopo site key (required)
	 */
	siteKey: string;

	/**
	 * The theme of the captcha ('light' or 'dark')
	 * Default: 'light'
	 */
	theme?: "light" | "dark";

	/**
	 * The type of captcha to display ('frictionless', 'image', or 'pow')
	 * Default: 'frictionless'
	 */
	captchaType?: "frictionless" | "image" | "pow";

	/**
	 * The size of the captcha
	 */
	size?: "normal" | "compact";

	/**
	 * The tabindex of the captcha
	 */
	tabindex?: number;

	/**
	 * Callback function called when the captcha is verified
	 */
	callback?: ((token: string) => void) | string;

	/**
	 * Callback function called when the captcha token expires
	 */
	"expired-callback"?: (() => void) | string;

	/**
	 * Callback function called when the captcha verification fails
	 */
	"failed-callback"?: (() => void) | string;

	/**
	 * Callback function called when an error occurs
	 */
	"error-callback"?: (() => void) | string;

	/**
	 * Callback function called when the captcha is closed
	 */
	"close-callback"?: (() => void) | string;

	/**
	 * Callback function called when the captcha is opened
	 */
	"open-callback"?: (() => void) | string;

	/**
	 * Callback function called when the captcha is reset
	 */
	"reset-callback"?: (() => void) | string;

	/**
	 * The amount of time, in milliseconds, a successful captcha challenge is valid for
	 * Default: 2 minutes (120000 ms)
	 */
	"challenge-valid-length"?: number;

	/**
	 * The language of the captcha widget
	 * Default: 'en'
	 */
	language?: string;
}
