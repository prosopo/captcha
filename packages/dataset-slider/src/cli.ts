#!/usr/bin/env node

import { SliderDatasetGenerator } from "./slider/generator.js";
import { resolve, join } from "path";
import { mkdir } from "fs/promises";

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options: Record<string, string | number | boolean | undefined> = {
        outputDir: "./output",
        baseImageDir: "./images",
        count: 10,
        pieceWidth: 60,
        pieceHeight: 60,
        tolerance: 10,
        timeLimitMs: 30000,
        help: false,
        verbose: false,
        assetBaseUrl: undefined,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === "--help" || arg === "-h") {
            options.help = true;
            break;
        } else if (arg === "--verbose" || arg === "-v") {
            options.verbose = true;
        } else if (arg === "--output" || arg === "-o") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.outputDir = nextArg;
                i++;
            }
        } else if (arg === "--images" || arg === "-i") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.baseImageDir = nextArg;
                i++;
            }
        } else if (arg === "--count" || arg === "-c") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.count = parseInt(nextArg, 10);
                i++;
            }
        } else if (arg === "--width" || arg === "-w") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.pieceWidth = parseInt(nextArg, 10);
                i++;
            }
        } else if (arg === "--height") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.pieceHeight = parseInt(nextArg, 10);
                i++;
            }
        } else if (arg === "--tolerance" || arg === "-t") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.tolerance = parseInt(nextArg, 10);
                i++;
            }
        } else if (arg === "--time-limit") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.timeLimitMs = parseInt(nextArg, 10);
                i++;
            }
        } else if (arg === "--asset-url" || arg === "-u") {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                options.assetBaseUrl = nextArg;
                i++;
            }
        }
    }

    return options;
}

// Print help message
function printHelp() {
    console.log(`
Prosopo Slider Captcha Dataset Generator

Usage: dataset-slider [options]

Options:
  -h, --help             Display this help message
  -v, --verbose          Show verbose output
  -o, --output DIR       Output directory for the dataset (default: ./output)
  -i, --images DIR       Directory containing source images (default: ./images)
  -c, --count NUM        Number of captchas to generate (default: 10)
  -w, --width NUM        Width of puzzle piece in pixels (default: 60)
  --height NUM           Height of puzzle piece in pixels (default: 60)
  -t, --tolerance NUM    Tolerance in pixels for matching (default: 10)
  --time-limit NUM       Time limit in milliseconds (default: 30000)
  -u, --asset-url URL    Base URL for assets in the dataset (optional)
                         Examples:
                         - Local file: "file:///path/to/assets/"
                         - Relative path: "./assets/"
                         - Web URL: "https://example.com/assets/"

Example:
  dataset-slider --output ./my-datasets --images ./my-photos --count 20
  dataset-slider --output ./my-datasets --images ./my-photos --asset-url "file:///$(pwd)/my-datasets/assets/"
`);
}

// Main function
async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        return;
    }

    try {
        // Resolve paths to absolute paths
        const outputDir = resolve(options.outputDir as string);
        const baseImageDir = resolve(options.baseImageDir as string);
        const verbose = options.verbose as boolean;
        const assetBaseUrl = options.assetBaseUrl as string | undefined;

        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });

        console.log("Prosopo Slider Captcha Dataset Generator");
        console.log("---------------------------------------");
        console.log(`Source images: ${baseImageDir}`);
        console.log(`Output directory: ${outputDir}`);
        console.log(`Captcha count: ${options.count}`);
        console.log(`Puzzle piece size: ${options.pieceWidth}x${options.pieceHeight} pixels`);
        console.log(`Tolerance: ${options.tolerance} pixels`);
        console.log(`Time limit: ${options.timeLimitMs} ms`);
        if (assetBaseUrl) {
            console.log(`Asset base URL: ${assetBaseUrl}`);
        } else {
            console.log(`Asset base URL: not specified (using relative paths)`);
        }
        console.log("---------------------------------------");

        // Initialize the generator
        const generator = new SliderDatasetGenerator({
            outputDir,
            count: options.count as number,
            baseImageDir,
            puzzlePieceSize: {
                width: options.pieceWidth as number,
                height: options.pieceHeight as number,
            },
            tolerance: options.tolerance as number,
            timeLimitMs: options.timeLimitMs as number,
            assetBaseUrl,
        });

        // Generate the dataset
        console.log("Generating dataset...");
        await generator.generate();
        console.log("Dataset generation complete!");
        
        // Provide instructions for use with Prosopo
        console.log("\nTo use this dataset with Prosopo:");
        console.log("1. Register the dataset in the Prosopo network");
        console.log("2. Update your provider's config.json to include the dataset ID");
        console.log("3. Ensure the assets directory is accessible to your provider");
        
        if (verbose) {
            console.log("\nDataset Structure:");
            console.log("- Base images: PNG files with cutouts in assets/");
            console.log("- Puzzle pieces: PNG files extracted from base images in assets/");
            console.log("- Each puzzle piece has a target position recorded in the dataset.json");
            console.log("- Users must position the piece within tolerance to solve the captcha");
            
            if (!assetBaseUrl) {
                console.log("\nNote: No asset base URL was specified. To use with a provider, you may need to:");
                console.log("1. Copy the assets directory to your provider's assets folder");
                console.log("2. Run again with --asset-url set to where the assets will be served from");
                console.log("   Example: --asset-url \"https://provider.example.com/assets/\"");
            }
        }
    } catch (error) {
        console.error("Error generating dataset:", error);
        process.exit(1);
    }
}

// Run the CLI
main().catch(console.error); 