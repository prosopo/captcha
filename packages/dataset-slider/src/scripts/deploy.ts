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
 * Script to deploy slider captcha datasets to a provider's assets directory
 */
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// Use a more direct approach to find all files
function findAllFiles(directory: string, pattern: string): string[] {
	const files: string[] = [];

	function traverseDirectory(dir: string) {
		try {
			const items = readdirSync(dir);

			for (const item of items) {
				const fullPath = join(dir, item);
				const stats = statSync(fullPath);

				if (stats.isDirectory()) {
					traverseDirectory(fullPath);
				} else if (stats.isFile() && fullPath.endsWith(pattern)) {
					files.push(fullPath);
				}
			}
		} catch (error) {
			console.error(`Error reading directory ${dir}:`, error);
		}
	}

	traverseDirectory(directory);
	return files;
}

// Parse command line arguments
const args = process.argv.slice(2);
let sourceDir = "./output";
let targetDir = "../provider/assets/slider-datasets";
let clientBundleDir =
	"../../demos/client-bundle-example/src/assets/slider-datasets";
let verbose = false;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--source" || arg === "-s") {
		const nextArg = args[++i];
		if (nextArg) sourceDir = nextArg;
	} else if (arg === "--target" || arg === "-t") {
		const nextArg = args[++i];
		if (nextArg) targetDir = nextArg;
	} else if (arg === "--client-bundle" || arg === "-c") {
		const nextArg = args[++i];
		if (nextArg) clientBundleDir = nextArg;
	} else if (arg === "--verbose" || arg === "-v") {
		verbose = true;
	} else if (arg === "--help" || arg === "-h") {
		console.log(`
Usage: node deploy.js [options]

Options:
  --source, -s         Source directory containing datasets (default: ./output)
  --target, -t         Target directory to deploy to (default: ../provider/assets/slider-datasets)
  --client-bundle, -c  Client bundle directory (default: ../../demos/client-bundle-example/src/assets/slider-datasets)
  --verbose, -v        Show verbose output
  --help, -h           Show this help
`);
		process.exit(0);
	}
}

// Ensure source directory exists
if (!existsSync(sourceDir)) {
	console.error(`Error: Source directory '${sourceDir}' does not exist`);
	process.exit(1);
}

// Ensure target directory exists or create it
if (!existsSync(targetDir)) {
	console.log(`Creating target directory: ${targetDir}`);
	mkdirSync(targetDir, { recursive: true });
}

// Ensure client bundle directory exists or create it
if (!existsSync(clientBundleDir)) {
	console.log(`Creating client bundle directory: ${clientBundleDir}`);
	mkdirSync(clientBundleDir, { recursive: true });
}

// Function to copy a dataset
async function deployDataset(datasetPath: string): Promise<boolean> {
	try {
		// Read the dataset file
		const datasetContent = readFileSync(datasetPath, "utf8");
		const dataset = JSON.parse(datasetContent);

		// Create a directory for this dataset in the target directory
		const datasetName = basename(datasetPath, ".json");
		const datasetDir = join(targetDir, datasetName);

		if (!existsSync(datasetDir)) {
			mkdirSync(datasetDir, { recursive: true });
		}

		// Create assets subdirectory in the target directory
		const assetsDir = join(datasetDir, "assets");
		if (!existsSync(assetsDir)) {
			mkdirSync(assetsDir, { recursive: true });
		}

		// Create a directory for this dataset in the client bundle
		const clientDatasetDir = join(clientBundleDir, datasetName);

		if (!existsSync(clientDatasetDir)) {
			mkdirSync(clientDatasetDir, { recursive: true });
		}

		// Create assets subdirectory in the client bundle
		const clientAssetsDir = join(clientDatasetDir, "assets");
		if (!existsSync(clientAssetsDir)) {
			mkdirSync(clientAssetsDir, { recursive: true });
		}

		// Copy the dataset file to the target directory
		const targetDatasetPath = join(datasetDir, "dataset.json");
		copyFileSync(datasetPath, targetDatasetPath);

		// Copy the dataset file to the client bundle
		const clientDatasetPath = join(clientDatasetDir, "dataset.json");
		copyFileSync(datasetPath, clientDatasetPath);

		if (verbose) {
			console.log(`Copied dataset: ${datasetPath} -> ${targetDatasetPath}`);
			console.log(`Copied dataset: ${datasetPath} -> ${clientDatasetPath}`);
		}

		// Get the assets directory from the source dataset
		const sourceAssetsDir = join(dirname(datasetPath), "assets");

		// Copy all assets referenced in the dataset
		const assetsCopied = new Set<string>();

		for (const captcha of dataset.captchas) {
			// Extract the base filename from the path or URL
			const baseImageFile = captcha.baseImage.data.split("/").pop();
			const puzzlePieceFile = captcha.puzzlePiece.data.split("/").pop();

			// Find the source files
			const sourceBaseImage = join(sourceAssetsDir, baseImageFile);
			const sourcePuzzlePiece = join(sourceAssetsDir, puzzlePieceFile);

			// Set the target paths
			const targetBaseImage = join(assetsDir, baseImageFile);
			const targetPuzzlePiece = join(assetsDir, puzzlePieceFile);

			// Set the client bundle paths
			const clientBaseImage = join(clientAssetsDir, baseImageFile);
			const clientPuzzlePiece = join(clientAssetsDir, puzzlePieceFile);

			// Copy base image to target
			if (existsSync(sourceBaseImage) && !assetsCopied.has(baseImageFile)) {
				copyFileSync(sourceBaseImage, targetBaseImage);
				copyFileSync(sourceBaseImage, clientBaseImage);
				assetsCopied.add(baseImageFile);

				if (verbose) {
					console.log(`Copied asset: ${sourceBaseImage} -> ${targetBaseImage}`);
					console.log(`Copied asset: ${sourceBaseImage} -> ${clientBaseImage}`);
				}
			}

			// Copy puzzle piece to target
			if (existsSync(sourcePuzzlePiece) && !assetsCopied.has(puzzlePieceFile)) {
				copyFileSync(sourcePuzzlePiece, targetPuzzlePiece);
				copyFileSync(sourcePuzzlePiece, clientPuzzlePiece);
				assetsCopied.add(puzzlePieceFile);

				if (verbose) {
					console.log(
						`Copied asset: ${sourcePuzzlePiece} -> ${targetPuzzlePiece}`,
					);
					console.log(
						`Copied asset: ${sourcePuzzlePiece} -> ${clientPuzzlePiece}`,
					);
				}
			}
		}

		console.log(
			`✓ Deployed dataset '${datasetName}' with ${assetsCopied.size} assets to provider and client bundle`,
		);
		return true;
	} catch (error) {
		console.error(`Error deploying dataset ${datasetPath}:`, error);
		return false;
	}
}

// Find all dataset files in the source directory
async function main() {
	const absoluteSourceDir = resolve(sourceDir);
	console.log(`Deploying slider captcha datasets from: ${absoluteSourceDir}`);
	console.log(`Target directory: ${resolve(targetDir)}`);
	console.log(`Client bundle directory: ${resolve(clientBundleDir)}`);

	const datasetFiles = findAllFiles(absoluteSourceDir, "dataset.json");

	if (datasetFiles.length === 0) {
		console.log("No dataset files found.");
		return;
	}

	console.log(`Found ${datasetFiles.length} dataset files`);

	let successCount = 0;

	for (const datasetPath of datasetFiles) {
		const success = await deployDataset(datasetPath);
		if (success) {
			successCount++;
		}
	}

	console.log(
		`\nDeployment complete: ${successCount}/${datasetFiles.length} datasets deployed successfully`,
	);
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
