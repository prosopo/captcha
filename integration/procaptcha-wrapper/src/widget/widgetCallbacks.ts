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

// https://docs.prosopo.io/en/basics/client-side-rendering/

interface WidgetCallbacks {
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is verified.
	 */
	onVerified?: ((token: string) => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA challenge fails.
	 */
	onFailed?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA challenge expires.
	 */
	onChallengeExpired?: (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is opened.
	 */
	onOpened?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is closed.
	 */
	onClosed?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when the CAPTCHA is reset.
	 */
	onReset?: () => (() => void) | string;
	/**
	 * The name of the window function, or a function, that will be called when an error occurs.
	 */
	onError?: () => ((error: Error) => void) | string;
}

export type { WidgetCallbacks };
