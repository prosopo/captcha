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
import type { SliderDataset } from "../types.js";

export class SliderDatasetValidator {
	validate(dataset: SliderDataset): boolean {
		// Validate dataset format
		if (dataset.format !== "slider") {
			return false;
		}

		// Validate dataset ID
		if (!dataset.datasetId || typeof dataset.datasetId !== "string") {
			return false;
		}

		// Validate captchas array
		if (!Array.isArray(dataset.captchas)) {
			return false;
		}

		// Validate each captcha
		for (const captcha of dataset.captchas) {
			if (!this.validateCaptcha(captcha)) {
				return false;
			}
		}

		return true;
	}

	private validateCaptcha(captcha: SliderDataset["captchas"][0]): boolean {
		// Validate salt
		if (!captcha.salt || typeof captcha.salt !== "string") {
			return false;
		}

		// Validate base image
		if (!this.validateCaptchaItem(captcha.baseImage)) {
			return false;
		}

		// Validate puzzle piece
		if (!this.validateCaptchaItem(captcha.puzzlePiece)) {
			return false;
		}

		// Validate time limit if present
		if (
			captcha.timeLimitMs !== undefined &&
			typeof captcha.timeLimitMs !== "number"
		) {
			return false;
		}

		return true;
	}

	private validateCaptchaItem(item: {
		hash: string;
		data: string;
		type: string;
	}): boolean {
		if (!item.hash || typeof item.hash !== "string") {
			return false;
		}

		if (!item.data || typeof item.data !== "string") {
			return false;
		}

		if (!item.type || typeof item.type !== "string") {
			return false;
		}

		return true;
	}
}
