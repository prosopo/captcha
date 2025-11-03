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
};

export type UserScope = UserAttributes & UserIp;

// flat structure is used to fit the Redis requirements
export type AccessRule = AccessPolicy &
	PolicyScope &
	UserScope & {
		groupId?: string;
	};
