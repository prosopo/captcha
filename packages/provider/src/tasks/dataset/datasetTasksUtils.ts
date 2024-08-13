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
import { ProsopoEnvError } from "@prosopo/common";
import { buildDataset } from "@prosopo/datasets";
import type { DatasetRaw } from "@prosopo/types";

export const providerValidateDataset = async (
	datasetRaw: DatasetRaw,
	minSolvedCaptchas: number,
	minUnsolvedCaptchas: number,
) => {
	// Check that the number of captchas in the dataset is greater or equal to min number of solved captchas
	if (datasetRaw.captchas.length < minSolvedCaptchas + minUnsolvedCaptchas) {
		throw new ProsopoEnvError("DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED", {
			context: { failedFuncName: providerValidateDataset.name },
		});
	}

	const solutions = datasetRaw.captchas
		.map((captcha): number => (captcha.solution ? 1 : 0))
		.reduce((partialSum, b) => partialSum + b, 0);

	// Check enough solved captchas
	if (solutions < minSolvedCaptchas) {
		throw new ProsopoEnvError("DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED", {
			context: { failedFuncName: providerValidateDataset.name },
		});
	}

	// Check enough unsolved captchas
	if (solutions < minUnsolvedCaptchas) {
		throw new ProsopoEnvError("DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED", {
			context: { failedFuncName: providerValidateDataset.name },
		});
	}

	const dataset = await buildDataset(datasetRaw);

	// Check DSetID and DSetContentID are defined
	if (!dataset.datasetId || !dataset.datasetContentId) {
		throw new ProsopoEnvError("DATASET.DATASET_ID_UNDEFINED", {
			context: {
				failedFuncName: providerValidateDataset.name,
				datasetId: dataset.datasetId,
				datasetContentId: dataset.datasetContentId,
			},
		});
	}

	return dataset;
};
