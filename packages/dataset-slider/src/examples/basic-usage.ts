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
import { readFile } from "node:fs/promises";
import { join } from "node:path";
// Import from local modules instead of @prosopo/dataset-slider
import { SliderDatasetGenerator } from "../slider/generator.js";
import { SliderDatasetValidator } from "../slider/validator.js";

async function generateDataset() {
	console.log("Generating slider captcha dataset...");

	// Initialize the generator with options
	const generator = new SliderDatasetGenerator({
		outputDir: "./output",
		count: 10, // Generate 10 captchas
		baseImageDir: "./images", // Directory containing source images
		puzzlePieceSize: {
			width: 60,
			height: 60,
		},
		tolerance: 10, // Tolerance in pixels for matching
		timeLimitMs: 30000, // 30 seconds to solve
	});

	// Generate the dataset
	await generator.generate();
	console.log("Dataset generated successfully!");
}

async function validateDataset() {
	console.log("Validating slider captcha dataset...");

	// Read the generated dataset
	const datasetPath = join("./output", "dataset.json");
	const datasetContent = await readFile(datasetPath, "utf-8");
	const dataset = JSON.parse(datasetContent);

	// Initialize the validator
	const validator = new SliderDatasetValidator();

	// Validate the dataset
	const isValid = validator.validate(dataset);

	if (isValid) {
		console.log("Dataset is valid!");
		console.log(`Dataset contains ${dataset.captchas.length} slider captchas`);

		// Print some information about the first captcha
		const firstCaptcha = dataset.captchas[0];
		console.log("\nFirst captcha information:");
		console.log(`- Salt: ${firstCaptcha.salt}`);
		console.log(`- Base image hash: ${firstCaptcha.baseImage.hash}`);
		console.log(`- Puzzle piece hash: ${firstCaptcha.puzzlePiece.hash}`);
		console.log(
			`- Target position: (${firstCaptcha.puzzlePiece.position?.x}, ${firstCaptcha.puzzlePiece.position?.y})`,
		);
		console.log(`- Time limit: ${firstCaptcha.timeLimitMs}ms`);
	} else {
		console.error("Dataset validation failed!");
	}
}

// Main function to run the example
async function main() {
	try {
		await generateDataset();
		await validateDataset();
	} catch (error) {
		console.error("Error:", error);
	}
}

// Execute the example
main();

// To run this example:
// 1. Ensure you have source images in the "./images" directory
// 2. Create an "output" directory or ensure it can be created
// 3. Run with: npx tsx src/examples/basic-usage.ts
