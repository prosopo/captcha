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
import { defineErrorCodes } from "better-auth";

export const PROCAPTCHA_SITEVERIFY_URL = "https://api.prosopo.io/siteverify";

export const PROCAPTCHA_HEADER = "x-captcha-response";

export const DEFAULT_ENDPOINTS: readonly string[] = [
	"/sign-up/email",
	"/sign-in/email",
	"/request-password-reset",
];

export const DEFAULT_TIMEOUT_MS = 10_000;

export const PROCAPTCHA_ERROR_CODES = defineErrorCodes({
	PROCAPTCHA_MISSING_RESPONSE: "Missing Procaptcha response",
	PROCAPTCHA_VERIFICATION_FAILED: "Procaptcha verification failed",
	PROCAPTCHA_SERVICE_UNAVAILABLE: "Procaptcha service unavailable",
	PROCAPTCHA_UNKNOWN_ERROR: "Something went wrong",
});

export type ProcaptchaErrorCode = keyof typeof PROCAPTCHA_ERROR_CODES;
