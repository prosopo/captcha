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
import type { AccountId } from "@polkadot/types/interfaces/runtime";
import type { TranslationKey } from "@prosopo/locale";
import {
	array,
	custom,
	nativeEnum,
	number,
	object,
	string,
	union,
	type infer as zInfer,
	number as zNumber,
	undefined as zUndefined,
} from "zod";

export enum CaptchaTypes {
	SelectAll = "SelectAll",
}
export enum CaptchaItemTypes {
	Text = "text",
	Image = "image",
}
export enum CaptchaStates {
	Solved = "solved",
	Unsolved = "unsolved",
}
export type RawSolution = number;
export type HashedSolution = string;
export type Item = zInfer<typeof CaptchaItemSchema>;
export type HashedItem = zInfer<typeof HashedCaptchaItemSchema>;
export type LabelledItem = zInfer<typeof LabelledItemSchema>;
export type Data = zInfer<typeof DataSchema>;
export type CaptchasContainer = zInfer<typeof CaptchasContainerSchema>;

export interface Captchas {
	captchas: CaptchaWithoutId[];
	format: CaptchaTypes;
}

type CaptchaWithoutIdBase = {
	salt: string;
	items: HashedItem[];
	target: string;
	solved?: boolean;
	timeLimitMs?: number;
};

export interface CaptchaWithoutId extends CaptchaWithoutIdBase {
	solution?: HashedSolution[] | RawSolution[]; // this contains the CORRECT items only!
	unlabelled?: HashedSolution[] | RawSolution[]; // this contains the unlabelled items only!
	// INCORRECT items are any missing from the solution and unlabelled arrays!
}

export interface Captcha extends CaptchaWithoutId {
	captchaId: string;
	captchaContentId: string;
	assetURI?: string;
	datasetId?: string;
	datasetContentId?: string;
}

export interface CaptchaResult {
	status: CaptchaStatus;
	reason?: TranslationKey;
}

export enum CaptchaStatus {
	pending = "Pending",
	approved = "Approved",
	disapproved = "Disapproved",
}

type Hash = string | number[];

export type Commit = {
	id: Hash;
	userAccount: string;
	datasetId: Hash;
	dappAccount: string;
	providerAccount: string;
	userSignature: string;
};

export enum GovernanceStatus {
	active = "Active",
	inactive = "Inactive",
}

export type Dapp = {
	status: GovernanceStatus;
	balance: string | number;
	owner: AccountId;
	payee: DappPayee;
};

export enum DappPayee {
	provider = "Provider",
	dapp = "Dapp",
	any = "Any",
}

export const TimestampSchema = zNumber();
export type Timestamp = zInfer<typeof TimestampSchema>;
export type UserAccount = string;
export type DappAccount = string;
export type DatasetID = string;

export const POW_SEPARATOR = "___";

export type PoWChallengeId =
	`${Timestamp}${typeof POW_SEPARATOR}${UserAccount}${typeof POW_SEPARATOR}${DappAccount}`;

// biome-ignore lint/suspicious/noExplicitAny: TODO fix
export const PowChallengeIdSchema = custom<PoWChallengeId>((val: any) => {
	const valSplit = val.split(POW_SEPARATOR);
	try {
		Number.parseInt(valSplit[0]);
		return valSplit.length === 4;
	} catch (e) {
		return false;
	}
});

export interface CaptchaSolution {
	captchaId: string;
	captchaContentId: string;
	salt: string;
	solution: HashedSolution[];
}

export type PoWChallengeComponents = {
	requestedAtTimestamp: Timestamp;
	userAccount: UserAccount;
	dappAccount: DappAccount;
};

export interface PoWCaptcha {
	challenge: PoWChallengeId;
	difficulty: number;
	providerSignature: string;
	requestedAtTimestamp: number;
	userSignature?: string;
}

export interface PoWCaptchaUser extends PoWCaptcha {
	userAccount: UserAccount;
	dappAccount: DappAccount;
}

export type CaptchaConfig = {
	solved: {
		count: number;
	};
	unsolved: {
		count: number;
	};
};

export type CaptchaSolutionConfig = {
	requiredNumberOfSolutions: number;
	solutionWinningPercentage: number;
	captchaBlockRecency: number;
};

export const CaptchaSchema = object({
	captchaId: union([string(), zUndefined()]),
	captchaContentId: union([string(), zUndefined()]),
	salt: string().min(34),
	solution: number().array().optional(),
	unlabelled: number().array().optional(),
	timeLimit: number().optional(),
});

export const CaptchaItemSchema = object({
	hash: string(),
	data: string(),
	type: nativeEnum(CaptchaItemTypes),
});

export const HashedCaptchaItemSchema = CaptchaItemSchema.extend({
	hash: string(),
});
export const LabelledItemSchema = HashedCaptchaItemSchema.extend({
	label: string(),
});

export const MaybeLabelledHashedItemSchema = HashedCaptchaItemSchema.extend({
	label: string().optional(),
});

export const SelectAllCaptchaSchemaRaw = CaptchaSchema.extend({
	items: array(CaptchaItemSchema),
	target: string(),
});

export const SelectAllCaptchaSchema = SelectAllCaptchaSchemaRaw.extend({
	solution: string().array().optional(),
	unlabelled: string().array().optional(),
});

export const SelectAllCaptchaSchemaWithNumericSolution =
	SelectAllCaptchaSchema.extend({
		solution: number().array().optional(),
		unlabelled: number().array().optional(),
	});

export const CaptchasSchema = array(SelectAllCaptchaSchemaRaw);
export const CaptchasWithNumericSolutionSchema = array(
	SelectAllCaptchaSchemaWithNumericSolution,
);

export const CaptchaSolutionSchema = object({
	captchaId: string(),
	captchaContentId: string(),
	solution: string().array(),
	salt: string().min(34),
});

export const CaptchaSolutionArraySchema = array(CaptchaSolutionSchema);

export const DataSchema = object({
	items: array(MaybeLabelledHashedItemSchema),
});

export const LabelledDataSchema = object({
	items: array(LabelledItemSchema),
});

export const CaptchasContainerSchema = object({
	captchas: CaptchasSchema,
	format: nativeEnum(CaptchaTypes),
});

export const LabelsContainerSchema = object({
	labels: array(string()),
});
