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

import { type ErrorCode, isErrorCode } from "@prosopo/common";

const RENAMED: Readonly<Record<string, ErrorCode>> = {
	"API.INVALID_SITE_KEY": "SITE_KEY_INVALID",
	"API.UNAUTHORIZED_ORIGIN_URL": "ORIGIN_NOT_ALLOWED",
	"API.BAD_REQUEST": "INVALID_REQUEST",
};

/**
 * A request validation outcome (a `ResultReason` or other translation key) as
 * the error code the widget branches on: the key without its namespace, e.g.
 * `API.VPN_BLOCKED` is `VPN_BLOCKED`. An outcome with no code of its own gets
 * `fallback`.
 */
export const errorCodeForReason = (
	reason: string | undefined,
	fallback: ErrorCode = "INVALID_REQUEST",
): ErrorCode => {
	if (reason === undefined) return fallback;
	const renamed = RENAMED[reason];
	if (renamed) return renamed;
	const unprefixed = reason.slice(reason.indexOf(".") + 1);
	return isErrorCode(unprefixed) ? unprefixed : fallback;
};
