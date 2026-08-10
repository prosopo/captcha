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
import type { CaptchaType } from "@prosopo/types";

export enum AccessPolicyType {
	Block = "block",
	Restrict = "restrict",
}

// Sentinel stamped on the Redis `clientId` field for rules that would
// otherwise store undefined (i.e. global rules). Lets the read path
// probe `@clientId:{global}` via the posting-list index instead of the
// expensive `ismissing(@clientId)` set-difference walk that degrades
// sharply once the global rule set grows into the 10k+ range. The
// reader converts it back to `undefined` at parse time so downstream
// code sees the original AccessRule shape. Kept in this types-only
// module so both the writer/index side and the parser/input side can
// import it without pulling in a circular dependency through
// transformRule.
export const GLOBAL_CLIENT_SCOPE_SENTINEL = "global";

export type AccessPolicy = {
	type: AccessPolicyType;
	captchaType?: CaptchaType;
	description?: string;
	solvedImagesCount?: number;
	imageThreshold?: number;
	powDifficulty?: number;
	unsolvedImagesCount?: number;
	frictionlessScore?: number;
	// When true, a Block policy does NOT fire at the request-time
	// blockMiddleware (so the user does not see a 401 on the captcha
	// challenge endpoint) — it fires at the verify step instead, marking
	// the commitment ACCESS_POLICY_BLOCK / disapproved. The verify
	// response returns `{verified:false}` to the dApp's server while the
	// user-facing widget completes normally. Mirrors the existing
	// coords-rule deferral pattern: the middleware blanks coords out of
	// the userScope, so coords rules can only ever be matched in the
	// verify path; `deferToVerify` is the explicit form for non-coords
	// signals (ja4, headersHash, etc.) when the operator wants the
	// attacker to pay the captcha-solving cost before being rejected.
	deferToVerify?: boolean;
};

export type PolicyScope = {
	clientId?: string;
};

export type UserIp = {
	numericIp?: bigint;
	numericIpMaskMin?: bigint;
	numericIpMaskMax?: bigint;
};

export type UserAttributes = {
	userId?: string;
	ja4Hash?: string;
	headersHash?: string;
	userAgentHash?: string;
	headHash?: string;
	coords?: string;
	countryCode?: string;
	asn?: number;
	// Operating system classified server-side from the request User-Agent (see
	// `classifyOs`). Stored as a plain lowercase tag — one of `OsName` — and
	// matched like `countryCode` (exact equality, not hashed). Lets a rule
	// drop/limit requests from a given OS even when the client omits client
	// hints.
	os?: string;
};

export type UserScope = UserAttributes & UserIp;

// flat structure is used to fit the Redis requirements
export type AccessRule = AccessPolicy &
	PolicyScope &
	UserScope & {
		groupId?: string;
	};
