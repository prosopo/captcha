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

export type AccessPolicy = {
	type: AccessPolicyType;
	captchaType?: CaptchaType;
	description?: string;
	solvedImagesCount?: number;
	imageThreshold?: number;
	powDifficulty?: number;
	unsolvedImagesCount?: number;
	frictionlessScore?: number;
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
};

export type UserScope = UserAttributes & UserIp;

// flat structure is used to fit the Redis requirements
export type AccessRule = AccessPolicy &
	PolicyScope &
	UserScope & {
		groupId?: string;
	};
