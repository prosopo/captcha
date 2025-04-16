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

/**
 * Simple test script to check if slider captcha datasets can be found in filesystem
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

// Set up paths
const datasetPath = join(process.cwd(), "assets/slider-datasets");
console.log(`Looking for slider captcha datasets in: ${datasetPath}`);

// Check if the directory exists
if (!existsSync(datasetPath)) {
	console.log(`Directory ${datasetPath} does not exist!`);
	process.exit(1);
}

// Get all directories in the dataset path
const directories = readdirSync(datasetPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

console.log(
	`Found ${directories.length} directories: ${directories.join(", ")}`,
);

// Find all dataset.json files in subdirectories
const datasetFiles = [];
for (const dir of directories) {
	const datasetFilePath = join(datasetPath, dir, "dataset.json");
	if (existsSync(datasetFilePath)) {
		datasetFiles.push(join(dir, "dataset.json"));
		console.log(`Found dataset file: ${datasetFilePath}`);
	}
}

console.log(`Found ${datasetFiles.length} dataset files`);

// Read one dataset file to check structure
if (datasetFiles.length > 0) {
	const firstDatasetPath = join(datasetPath, datasetFiles[0]);
	console.log(`Reading dataset file: ${firstDatasetPath}`);

	try {
		const dataset = JSON.parse(readFileSync(firstDatasetPath, "utf8"));
		console.log("Dataset structure:");
		console.log(`- datasetId: ${dataset.datasetId || "undefined"}`);
		console.log(`- format: ${dataset.format || "undefined"}`);
		console.log(`- captchas count: ${dataset.captchas?.length || 0}`);

		// Check asset files
		const assetDir = join(dirname(firstDatasetPath), "assets");
		console.log(`Checking asset directory: ${assetDir}`);
		try {
			const assetFiles = readdirSync(assetDir);
			console.log(`Found ${assetFiles.length} asset files in directory`);
		} catch (error) {
			console.error(
				`Error reading asset directory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	} catch (error) {
		console.error(
			`Error reading dataset file: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
} else {
	console.log("No dataset files found to read");
}
