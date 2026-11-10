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

import { array, nativeEnum, number, object, string } from "zod";
import { INPUT_LIMITS } from "../api/inputLimits.js";
import type { Hash } from "../provider/api.js";
import {
	type Captcha,
	CaptchaTypes,
	type CaptchaWithoutId,
	CaptchasSchema,
	CaptchasWithNumericSolutionSchema,
	SelectAllCaptchaSchema,
} from "./captcha.js";

export type DatasetBase = {
	datasetId?: Hash;
	datasetContentId?: Hash;
	format: CaptchaTypes;
	contentTree?: string[][];
	solutionTree?: string[][];
};

export interface Dataset extends DatasetBase {
	captchas: CaptchaWithoutId[] | Captcha[];
}

export interface DatasetRaw extends DatasetBase {
	captchas: CaptchaWithoutId[];
}

export type DatasetWithIds = {
	datasetId: Hash;
	datasetContentId: Hash;
	captchas: Captcha[];
	format: CaptchaTypes;
	contentTree?: string[][];
	solutionTree?: string[][];
};

export interface DatasetWithIdsAndTree extends DatasetWithIds {
	contentTree: string[][];
}

// Zod schemas

export const DatasetSchema = object({
	datasetId: string().max(INPUT_LIMITS.ID).optional(),
	datasetContentId: string().max(INPUT_LIMITS.TOKEN).optional(),
	captchas: CaptchasSchema,
	format: nativeEnum(CaptchaTypes),
	solutionTree: array(
		array(string().max(INPUT_LIMITS.LONG_TEXT)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	)
		.max(INPUT_LIMITS.ARRAY)
		.optional(),
	contentTree: array(
		array(string().max(INPUT_LIMITS.TOKEN)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	)
		.max(INPUT_LIMITS.ARRAY)
		.optional(),
	timeLimit: number().safe().optional(),
});

export const DatasetWithNumericSolutionSchema = DatasetSchema.extend({
	captchas: CaptchasWithNumericSolutionSchema,
});

export const DatasetWithIdsSchema = object({
	datasetId: string().max(INPUT_LIMITS.ID),
	datasetContentId: string().max(INPUT_LIMITS.TOKEN).optional(),
	captchas: array(SelectAllCaptchaSchema).max(INPUT_LIMITS.ARRAY),
	format: nativeEnum(CaptchaTypes),
	solutionTree: array(
		array(string().max(INPUT_LIMITS.LONG_TEXT)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	)
		.max(INPUT_LIMITS.ARRAY)
		.optional(),
	contentTree: array(
		array(string().max(INPUT_LIMITS.TOKEN)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	)
		.max(INPUT_LIMITS.ARRAY)
		.optional(),
});

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
	solutionTree: array(
		array(string().max(INPUT_LIMITS.LONG_TEXT)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	).max(INPUT_LIMITS.ARRAY),
	contentTree: array(
		array(string().max(INPUT_LIMITS.TOKEN)).max(INPUT_LIMITS.DATASET_TREE_LEVEL),
	).max(INPUT_LIMITS.ARRAY),
});
