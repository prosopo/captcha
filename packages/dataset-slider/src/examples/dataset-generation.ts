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
import { join, resolve } from "path";
import { readdir, mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { createHash } from "crypto";
import { CaptchaItemTypes } from "@prosopo/types";

// Import types - when running this separately, you would use:
// import { CaptchaItemTypes, SliderCaptchaItem, SliderCaptchaWithoutId } from "@prosopo/types";
interface SliderCaptchaItem {
    hash: string;
    data: string;
    type: CaptchaItemTypes.SliderBase | CaptchaItemTypes.SliderPiece;
    position?: {
        x: number;
        y: number;
    };
}

interface SliderCaptchaWithoutId {
    salt: string;
    baseImage: SliderCaptchaItem;
    puzzlePiece: SliderCaptchaItem;
    solved?: boolean;
    timeLimitMs?: number;
}

/**
 * Generate a hash for an image
 */
async function hashImage(imagePath: string): Promise<string> {
    const imageBuffer = await sharp(imagePath).toBuffer();
    return createHash("sha256").update(imageBuffer).digest("hex");
}

/**
 * Process a single image into a slider captcha
 */
async function processImage(
    imagePath: string, 
    outputDir: string,
    assetsDir: string
): Promise<SliderCaptchaWithoutId> {
    // Load the image
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
        throw new Error("Could not determine image dimensions");
    }
    
    // Determine puzzle piece size (around 10-15% of the image)
    const pieceWidth = Math.round(metadata.width * 0.12);
    const pieceHeight = Math.round(metadata.height * 0.15);
    
    // Choose a random position for the puzzle piece
    const maxX = metadata.width - pieceWidth - 20;
    const maxY = metadata.height - pieceHeight - 20;
    const puzzleX = Math.floor(Math.random() * maxX) + 10;
    const puzzleY = Math.floor(Math.random() * maxY) + 10;
    
    // Create unique filenames
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex");
    const baseImageFilename = `base_${timestamp}_${random}.png`;
    const pieceImageFilename = `piece_${timestamp}_${random}.png`;
    
    const baseImagePath = join(assetsDir, baseImageFilename);
    const pieceImagePath = join(assetsDir, pieceImageFilename);
    
    // Extract the puzzle piece and save it
    await sharp(imagePath)
        .extract({
            left: puzzleX,
            top: puzzleY,
            width: pieceWidth,
            height: pieceHeight,
        })
        .png({ quality: 90 })
        .toFile(pieceImagePath);
    
    // Create a mask for the cutout
    const mask = await sharp({
        create: {
            width: metadata.width,
            height: metadata.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([
            {
                input: Buffer.from(
                    `<svg>
                        <rect
                            x="${puzzleX}"
                            y="${puzzleY}"
                            width="${pieceWidth}"
                            height="${pieceHeight}"
                            fill="black"
                        />
                    </svg>`
                ),
                blend: "dest-out",
            },
        ])
        .png()
        .toBuffer();
    
    // Create the base image with cutout and save it
    await sharp(imagePath)
        .composite([
            {
                input: mask,
                blend: "dest-out",
                gravity: "northwest",
            },
        ])
        .png({ quality: 90 })
        .toFile(baseImagePath);
    
    // Generate hashes for the images
    const baseImageHash = await hashImage(baseImagePath);
    const pieceImageHash = await hashImage(pieceImagePath);
    
    // Create captcha object
    return {
        salt: randomBytes(32).toString("hex"),
        baseImage: {
            hash: baseImageHash,
            data: baseImageFilename,
            type: CaptchaItemTypes.SliderBase
        },
        puzzlePiece: {
            hash: pieceImageHash,
            data: pieceImageFilename,
            type: CaptchaItemTypes.SliderPiece,
            position: {
                x: puzzleX,
                y: puzzleY
            }
        },
        solved: false,
        timeLimitMs: 30000 // 30 seconds to solve
    };
}

/**
 * Generate a complete slider captcha dataset
 */
async function generateDataset(
    sourceDir: string,
    outputDir: string,
    assetsDir: string,
    count: number = 10
): Promise<void> {
    // Create directories if they don't exist
    await mkdir(outputDir, { recursive: true });
    await mkdir(assetsDir, { recursive: true });
    
    // Get all image files
    const files = await readdir(sourceDir);
    const imageFiles = files
        .filter(file => 
            file.endsWith(".jpg") || 
            file.endsWith(".jpeg") || 
            file.endsWith(".png")
        )
        .map(file => join(sourceDir, file));
    
    console.log(`Found ${imageFiles.length} source images`);
    
    if (imageFiles.length === 0) {
        throw new Error("No source images found");
    }
    
    // Process up to 'count' images (may loop through the same images if count > imageFiles.length)
    const captchas: SliderCaptchaWithoutId[] = [];
    
    for (let i = 0; i < count; i++) {
        // Select an image (loop through if we have fewer images than requested count)
        const imageIndex = i % imageFiles.length;
        const imagePath = imageFiles[imageIndex];
        
        if (!imagePath) {
            console.error(`Error: Image path is undefined for index ${imageIndex}`);
            continue;
        }
        
        console.log(`Processing image ${i+1}/${count}: ${imagePath}`);
        
        try {
            const captcha = await processImage(imagePath, outputDir, assetsDir);
            captchas.push(captcha);
        } catch (error) {
            console.error(`Error processing ${imagePath}:`, error);
        }
    }
    
    console.log(`Generated ${captchas.length} slider captchas`);
    
    // Create the dataset file
    const dataset = {
        datasetId: randomBytes(32).toString("hex"),
        captchas,
        format: "slider" as const,
    };
    
    const datasetPath = join(outputDir, "slider-dataset.json");
    await writeFile(datasetPath, JSON.stringify(dataset, null, 2));
    
    console.log(`Dataset saved to ${datasetPath}`);
    console.log(`Assets saved to ${assetsDir}`);
}

// Example usage
async function main() {
    try {
        const baseDir = resolve("./examples_output");
        const sourceDir = join(baseDir, "source_images"); // Source images directory
        const outputDir = join(baseDir, "datasets"); // Dataset output directory
        const assetsDir = join(baseDir, "assets"); // Assets output directory
        
        console.log("Generating slider captcha dataset...");
        await generateDataset(sourceDir, outputDir, assetsDir, 20);
        console.log("Dataset generation complete!");
        
        console.log("\nTo use this dataset with Prosopo:");
        console.log("1. Move the assets to your provider's assets directory");
        console.log("2. Register the dataset in the Prosopo network");
        console.log(`3. Use the dataset ID: ${randomBytes(8).toString("hex")} (example ID)`);
    } catch (error) {
        console.error("Error generating dataset:", error);
    }
}

// Run the example
main();

// To run this example:
// 1. Create a directory "./examples_output/source_images" with some image files
// 2. Run with: npx tsx src/examples/dataset-generation.ts 