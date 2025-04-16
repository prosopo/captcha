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
import type {
	SliderCaptcha,
	SliderCaptchaItem,
	SliderCaptchaWithoutId,
} from "@prosopo/types";

export interface SliderDataset {
	datasetId: string;
	captchas: SliderCaptchaWithoutId[];
	format: "slider";
}

export interface SliderDatasetWithIds {
	datasetId: string;
	captchas: SliderCaptcha[];
	format: "slider";
}

export interface SliderDatasetGenerationOptions {
	outputDir: string;
	count: number;
	baseImageDir: string;
	puzzlePieceSize: {
		width: number;
		height: number;
	};
	tolerance: number;
	timeLimitMs?: number;
	/**
	 * Optional base URL to prepend to asset filenames.
	 * For local development, this can be:
	 * - An absolute file path: "file:///path/to/assets/"
	 * - A relative path: "./assets/"
	 * - A web URL: "https://example.com/assets/"
	 */
	assetBaseUrl?: string;
	/**
	 * Optional shape name to use for all puzzle pieces.
	 * If not provided, shapes will be randomly selected.
	 * See the PUZZLE_SHAPES array for available shape names.
	 */
	selectedShapeName?: string;
}
