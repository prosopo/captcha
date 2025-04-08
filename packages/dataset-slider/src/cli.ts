#!/usr/bin/env node

import { SliderDatasetGenerator } from "./slider/generator.js";
import { resolve, join } from "path";
import { mkdir, readdir, copyFile, stat, access } from "fs/promises";
import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import sharp from "sharp";
import { createHash } from "crypto";
import path from "path";
import { PUZZLE_SHAPES } from "./slider/shapes.js";

async function fileExists(filepath: string): Promise<boolean> {
    try {
        await access(filepath);
        return true;
    } catch {
        return false;
    }
}

async function isDirectory(dirpath: string): Promise<boolean> {
    try {
        const stats = await stat(dirpath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function isImageFile(filepath: string): Promise<boolean> {
    return filepath.toLowerCase().endsWith('.jpg') || 
           filepath.toLowerCase().endsWith('.jpeg') || 
           filepath.toLowerCase().endsWith('.png');
}

async function findImages(directory: string): Promise<string[]> {
    try {
        const files = await readdir(directory);
        const imageFiles = [];
        
        for (const file of files) {
            const fullPath = join(directory, file);
            if (await isImageFile(fullPath)) {
                imageFiles.push(fullPath);
            }
        }
        
        return imageFiles;
    } catch (error) {
        console.error(`Error finding images in ${directory}:`, error);
        return [];
    }
}

async function createTestImage(outputPath: string): Promise<boolean> {
    try {
        // Create a simple gradient image using sharp
        const width = 800;
        const height = 600;
        
        // Create a linear gradient SVG
        const svg = `
        <svg width="${width}" height="${height}">
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="blue" />
                    <stop offset="100%" stop-color="red" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#gradient)" />
        </svg>`;
        
        // Convert the SVG to PNG
        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);
            
        return true;
    } catch (error) {
        console.error("Error creating test image:", error);
        return false;
    }
}

async function prepareTestImages(options: any): Promise<string[]> {
    const imagesDir = resolve(options.baseImageDir);
    
    // Create images directory if it doesn't exist
    if (!await isDirectory(imagesDir)) {
        await mkdir(imagesDir, { recursive: true });
    }
    
    // Check if we already have images
    let images = await findImages(imagesDir);
    
    if (images.length === 0 && options.autoGenerateImages) {
        console.log(`No images found in ${imagesDir}. Generating test images...`);
        
        // Create a few test images
        for (let i = 1; i <= 3; i++) {
            const imagePath = join(imagesDir, `test-gradient-${i}.png`);
            await createTestImage(imagePath);
        }
        
        // Check again for images
        images = await findImages(imagesDir);
    }
    
    return images;
}

async function cleanOutputDirectory(outputDir: string): Promise<void> {
    // Create output directory if it doesn't exist
    if (!await isDirectory(outputDir)) {
        await mkdir(outputDir, { recursive: true });
        return;
    }
    
    // Create or clean assets directory
    const assetsDir = join(outputDir, "assets");
    if (await isDirectory(assetsDir)) {
        // Clean the directory by removing all PNG files
        try {
            const files = await readdir(assetsDir);
            for (const file of files) {
                if (file.endsWith('.png')) {
                    await fs.promises.unlink(join(assetsDir, file));
                }
            }
        } catch (error) {
            console.error(`Error cleaning assets directory: ${error}`);
        }
    } else {
        await mkdir(assetsDir, { recursive: true });
    }
    
    // Remove old dataset.json if it exists
    const datasetPath = join(outputDir, "dataset.json");
    if (await fileExists(datasetPath)) {
        await fs.promises.unlink(datasetPath);
    }
}

/**
 * Generates a test dataset with one captcha for each shape type
 */
async function generateAllShapesTest(baseArgs: any): Promise<void> {
    const shapeNames = PUZZLE_SHAPES.map(shape => shape.name);
    console.log(`Generating test dataset with one captcha for each of the ${shapeNames.length} shapes...`);
    
    const outputDir = resolve(baseArgs.output);
    const baseImageDir = resolve(baseArgs.images);
    
    // Prepare test images
    const imageOptions = {
        baseImageDir: baseArgs.images,
        autoGenerateImages: baseArgs['auto-generate']
    };
    
    const images = await prepareTestImages(imageOptions);
    
    if (images.length === 0) {
        console.error(`No images found in ${baseImageDir}. Please add some images or use --auto-generate.`);
        process.exit(1);
    }
    
    // Clean output directory
    await cleanOutputDirectory(outputDir);
    
    // Create generator options that will be used for all shapes
    const baseOptions = {
        outputDir,
        count: shapeNames.length, // One for each shape
        baseImageDir,
        puzzlePieceSize: {
            width: baseArgs.width,
            height: baseArgs.height,
        },
        tolerance: baseArgs.tolerance,
        timeLimitMs: baseArgs['time-limit'],
        assetBaseUrl: baseArgs['asset-url'],
        // We'll set selectedShapeName for each individual generation
    };
    
    // Track overall success
    let totalSuccess = 0;
    
    // Process each shape
    for (const shapeName of shapeNames) {
        try {
            console.log(`\nGenerating captcha for shape: ${shapeName}`);
            
            // Create a generator with just this shape
            const generator = new SliderDatasetGenerator({
                ...baseOptions,
                count: 1,
                selectedShapeName: shapeName,
            });
            
            // Generate a single captcha with this shape
            await generator.generate();
            totalSuccess++;
            
        } catch (error) {
            console.error(`Error generating captcha for shape ${shapeName}:`, error);
        }
    }
    
    console.log(`\nTest complete: Successfully generated ${totalSuccess} of ${shapeNames.length} shapes.`);
    console.log(`Assets saved to: ${resolve(join(outputDir, "assets"))}`);
    console.log(`Dataset saved to: ${resolve(join(outputDir, "dataset.json"))}`);
}

async function main() {
    // Get list of available shape names for the CLI help
    const availableShapes = PUZZLE_SHAPES.map(shape => shape.name).join(', ');
    
    // Parse command line arguments with yargs
    const argv = yargs(hideBin(process.argv))
        .command('generate', 'Generate a slider captcha dataset', () => {}, (argv) => {
            // Default generate command, handled in main()
        })
        .command('init-provider', 'Initialize a provider with shaped slider captchas', () => {}, (argv) => {
            // When init-provider command is used, call the setup script
            const { execSync } = require('child_process');
            const setupScriptPath = join(__dirname, 'scripts', 'setup.js');
            
            // Build command with all passed arguments
            let command = `node ${setupScriptPath}`;
            
            // Pass through any relevant arguments
            if (argv.images) command += ` --images "${argv.images}"`;
            if (argv.output) command += ` --output "${argv.output}"`;
            if (argv.provider) command += ` --provider "${argv.provider}"`;
            if (argv.target) command += ` --target "${argv.target}"`;
            if (argv.config) command += ` --config "${argv.config}"`;
            if (argv.count) command += ` --count ${argv.count}`;
            if (argv.shapes) command += ` --shapes "${argv.shapes}"`;
            if (argv['auto-generate']) command += ` --auto-generate`;
            if (argv.verbose) command += ` --verbose`;
            
            // Execute setup script
            console.log(`Running provider setup: ${command}`);
            try {
                execSync(command, { stdio: 'inherit' });
                process.exit(0);
            } catch (error) {
                console.error('Provider setup failed:', error);
                process.exit(1);
            }
        })
        .options({
            'images': {
                alias: 'i',
                describe: 'Directory containing source images',
                type: 'string',
                default: './images'
            },
            'output': {
                alias: 'o',
                describe: 'Output directory for the dataset',
                type: 'string',
                default: './output'
            },
            'count': {
                alias: 'c',
                describe: 'Number of captchas to generate',
                type: 'number',
                default: 10
            },
            'width': {
                alias: 'w',
                describe: 'Width of puzzle piece in pixels',
                type: 'number',
                default: 60
            },
            'height': {
                describe: 'Height of puzzle piece in pixels',
                type: 'number',
                default: 60
            },
            'tolerance': {
                alias: 't',
                describe: 'Tolerance in pixels for matching',
                type: 'number',
                default: 10
            },
            'time-limit': {
                describe: 'Time limit in milliseconds',
                type: 'number',
                default: 30000
            },
            'shape': {
                alias: 's',
                describe: `Specific puzzle piece shape to use: ${availableShapes}`,
                type: 'string'
            },
            'asset-url': {
                alias: 'u',
                describe: 'Base URL for assets in the dataset',
                type: 'string'
            },
            'auto-generate': {
                describe: 'Automatically generate test images if none exist',
                type: 'boolean',
                default: false
            },
            'verbose': {
                alias: 'v',
                describe: 'Show verbose output',
                type: 'boolean',
                default: false
            },
            'test': {
                describe: 'Run in test mode (generates one captcha for each shape)',
                type: 'boolean',
                default: false
            },
            // Additional options for init-provider command
            'provider': {
                alias: 'p',
                describe: 'Provider directory path',
                type: 'string',
                default: '../provider'
            },
            'target': {
                describe: 'Target directory for deployment',
                type: 'string',
                default: '../provider/assets/slider-datasets'
            },
            'config': {
                describe: 'Path to provider config file',
                type: 'string',
                default: '../provider/config.json'
            },
            'shapes': {
                describe: 'Shapes to generate for provider (comma-separated)',
                type: 'string',
                default: 'star,heart,cloud,hexagon,drop'
            }
        })
        .help()
        .version()
        .alias('help', 'h')
        .parseSync();

    try {
        // If in test mode, use predefined paths and generate one of each shape
        if (argv.test) {
            argv.images = './test-images';
            argv.output = './test-output';
            argv['auto-generate'] = true;
            argv.verbose = true;
            
            return await generateAllShapesTest(argv);
        }
        
        // Standard mode: generate captchas based on command line arguments
        // Resolve paths to absolute paths
        const outputDir = resolve(argv.output);
        const baseImageDir = resolve(argv.images);
        const verbose = argv.verbose;
        
        // Automatically set asset URL if not provided
        let assetBaseUrl = argv['asset-url'];
        if (!assetBaseUrl) {
            const cwd = process.cwd();
            assetBaseUrl = `file://${cwd}/${argv.output}/assets/`;
            if (verbose) {
                console.log(`No asset base URL provided. Using: ${assetBaseUrl}`);
            }
        }
        
        // Prepare test images
        const imageOptions = {
            baseImageDir: argv.images,
            autoGenerateImages: argv['auto-generate']
        };
        
        const images = await prepareTestImages(imageOptions);
        
        if (images.length === 0) {
            console.error(`No images found in ${baseImageDir}. Please add some images or use --auto-generate.`);
            process.exit(1);
        }
        
        // Clean output directory
        await cleanOutputDirectory(outputDir);
        
        console.log("Prosopo Slider Captcha Dataset Generator");
        console.log("---------------------------------------");
        console.log(`Source images: ${baseImageDir} (${images.length} images found)`);
        console.log(`Output directory: ${outputDir}`);
        console.log(`Captcha count: ${argv.count}`);
        console.log(`Puzzle piece size: ${argv.width}x${argv.height} pixels`);
        console.log(`Tolerance: ${argv.tolerance} pixels`);
        console.log(`Time limit: ${argv['time-limit']} ms`);
        
        if (argv.shape) {
            console.log(`Puzzle piece shape: ${argv.shape}`);
        } else {
            console.log("Puzzle piece shape: random (will use different shapes)");
        }
        
        console.log(`Asset base URL: ${assetBaseUrl}`);
        console.log("---------------------------------------");

        // Initialize the generator
        const generator = new SliderDatasetGenerator({
            outputDir,
            count: argv.count,
            baseImageDir,
            puzzlePieceSize: {
                width: argv.width,
                height: argv.height,
            },
            tolerance: argv.tolerance,
            timeLimitMs: argv['time-limit'],
            assetBaseUrl,
            selectedShapeName: argv.shape,
        });

        // Generate the dataset
        console.log("Generating dataset...");
        await generator.generate();
        console.log("Dataset generation complete!");
        
        // Count the number of generated files
        const assetsDir = join(outputDir, "assets");
        const assetFiles = await readdir(assetsDir);
        const baseImages = assetFiles.filter(file => file.startsWith('base_')).length;
        const pieceImages = assetFiles.filter(file => file.startsWith('piece_')).length;
        
        console.log(`Generated ${baseImages} base images and ${pieceImages} puzzle pieces`);
        console.log(`Dataset saved to: ${join(outputDir, "dataset.json")}`);
        
        // Show additional information in verbose mode
        if (verbose) {
            console.log("\nDataset Structure:");
            console.log("- Base images: PNG files with shape cutouts in assets/");
            console.log("- Puzzle pieces: PNG files with shapes extracted from base images in assets/");
            console.log("- Each puzzle piece has a target position recorded in the dataset.json");
            console.log("- Users must position the piece within tolerance to solve the captcha");
            console.log("\nAvailable shapes:");
            for (const shape of PUZZLE_SHAPES) {
                console.log(`- ${shape.name}: ${shape.width}x${shape.height}`);
            }
        }
        
        console.log("\nTo use this dataset with Prosopo:");
        console.log("1. Register the dataset in the Prosopo network");
        console.log("2. Update your provider's config.json to include the dataset ID");
        console.log("3. Ensure the assets directory is accessible to your provider");
    } catch (error) {
        console.error("Error generating dataset:", error);
        process.exit(1);
    }
}

// Run the CLI
main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
}); 