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
import sharp from "sharp";
import { randomBytes } from "crypto";
import { join, resolve } from "path";
import { mkdir, writeFile, readdir, access } from "fs/promises";
import { createHash } from "crypto";
import type { SliderDatasetGenerationOptions } from "../types.js";
import { CaptchaItemTypes, type SliderCaptchaWithoutId, type SliderCaptchaItem } from "@prosopo/types";
import { getRandomShape, createShapeSVG, createPieceSVG, type PuzzleShape, PUZZLE_SHAPES } from "./shapes.js";

export class SliderDatasetGenerator {
    private options: SliderDatasetGenerationOptions;

    constructor(options: SliderDatasetGenerationOptions) {
        this.options = options;
    }

    /**
     * Get a puzzle shape based on options
     * If selectedShapeName is provided, use that shape
     * Otherwise, get a random shape
     */
    private getShape(): PuzzleShape {
        const { selectedShapeName } = this.options;
        
        if (selectedShapeName) {
            // Find the shape with the matching name
            const selectedShape = PUZZLE_SHAPES.find(shape => shape.name === selectedShapeName);
            if (selectedShape) {
                return selectedShape;
            }
            console.warn(`Shape "${selectedShapeName}" not found. Using a random shape instead.`);
        }
        
        // Default to random shape
        return getRandomShape();
    }

    async generate(): Promise<void> {
        const { outputDir, count, baseImageDir, puzzlePieceSize, tolerance, timeLimitMs } = this.options;

        // Create output directory if it doesn't exist
        await mkdir(outputDir, { recursive: true });
        
        // Create assets directory within output directory
        const assetsDir = join(outputDir, "assets");
        await mkdir(assetsDir, { recursive: true });

        try {
            // Check if baseImageDir exists
            await access(baseImageDir);
        } catch (error) {
            throw new Error(`Base image directory ${baseImageDir} does not exist or is not accessible`);
        }

        // Get all image files from the baseImageDir
        const files = await readdir(baseImageDir);
        const imageFiles = files
            .filter(file => 
                file.toLowerCase().endsWith(".jpg") || 
                file.toLowerCase().endsWith(".jpeg") || 
                file.toLowerCase().endsWith(".png")
            )
            .map(file => join(baseImageDir, file));

        if (imageFiles.length === 0) {
            throw new Error(`No image files found in ${baseImageDir}. Please add some images.`);
        }

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
                const captcha = await this.generateCaptcha(
                    imagePath, 
                    assetsDir, 
                    puzzlePieceSize, 
                    tolerance, 
                    timeLimitMs
                );
                captchas.push(captcha);
            } catch (error) {
                console.error(`Error processing ${imagePath}:`, error);
            }
        }

        // Save the dataset
        const dataset = {
            datasetId: randomBytes(32).toString("hex"),
            captchas,
            format: "slider" as const,
        };

        await writeFile(
            join(outputDir, "dataset.json"),
            JSON.stringify(dataset, null, 2)
        );
        
        console.log(`Generated ${captchas.length} slider captchas`);
        console.log(`Dataset saved to: ${resolve(join(outputDir, "dataset.json"))}`);
        console.log(`Assets saved to: ${resolve(assetsDir)}`);
    }

    /**
     * Generate a hash for an image
     */
    private async hashImage(imageBuffer: Buffer): Promise<string> {
        return createHash("sha256").update(imageBuffer).digest("hex");
    }

    /**
     * Create a mask buffer from an SVG path
     */
    private async createMaskFromSVG(puzzleShape: PuzzleShape, width: number, height: number): Promise<Buffer> {
        // Create the SVG for the mask with the puzzle shape
        const svgString = `
        <svg width="${width}" height="${height}" viewBox="${puzzleShape.viewBox}" xmlns="http://www.w3.org/2000/svg">
            <path d="${puzzleShape.path}" fill="white" />
        </svg>`;
        
        // Convert the SVG to a PNG with a white shape on transparent background
        return await sharp(Buffer.from(svgString))
            .resize(width, height)
            .ensureAlpha()
            .png()
            .toBuffer();
    }

    /**
     * Create a shaped puzzle piece by applying a mask to an image region
     */
    private async createShapedPieceFromRegion(
        regionBuffer: Buffer, 
        maskBuffer: Buffer, 
        width: number, 
        height: number
    ): Promise<Buffer> {
        // Apply the mask to the region to extract the shaped piece
        return await sharp(regionBuffer)
            .resize(width, height)
            .ensureAlpha()
            .composite([
                {
                    input: maskBuffer,
                    blend: 'dest-in' // Keep only the parts of the region that are inside the mask
                }
            ])
            .png()
            .toBuffer();
    }

    /**
     * Create a base image with a shaped cutout using the mask
     */
    private async createBaseImageWithCutout(
        imagePath: string,
        maskBuffer: Buffer,
        puzzleX: number,
        puzzleY: number
    ): Promise<Buffer> {
        // Apply mask to the original image to create a proper shaped cutout
        return await sharp(imagePath)
            .composite([
                {
                    input: maskBuffer,
                    left: puzzleX,
                    top: puzzleY,
                    blend: 'dest-out' // Cut out the shape from the base image
                }
            ])
            .png()
            .toBuffer();
    }

    private async generateCaptcha(
        imagePath: string,
        assetsDir: string,
        puzzlePieceSize: { width: number; height: number },
        tolerance: number,
        timeLimitMs?: number
    ): Promise<SliderCaptchaWithoutId> {
        try {
            // Load the image
            const image = sharp(imagePath);
            const metadata = await image.metadata();
            
            if (!metadata.width || !metadata.height) {
                throw new Error("Could not determine image dimensions");
            }
            
            // Get a puzzle shape based on options
            const puzzleShape = this.getShape();
            
            // Scale the shape to match our target size
            const scaleX = puzzlePieceSize.width / puzzleShape.width;
            const scaleY = puzzlePieceSize.height / puzzleShape.height;
            
            // Maintain aspect ratio if needed
            const finalWidth = Math.round(puzzleShape.width * scaleX);
            const finalHeight = Math.round(puzzleShape.height * scaleY);
            
            // Choose a random position for the puzzle piece, avoiding the edges
            const maxX = metadata.width - finalWidth - 20;
            const maxY = metadata.height - finalHeight - 20;
            const puzzleX = Math.floor(Math.random() * maxX) + 10;
            const puzzleY = Math.floor(Math.random() * maxY) + 10;
            
            // Create unique filenames
            const timestamp = Date.now();
            const random = randomBytes(4).toString("hex");
            const baseImageFilename = `base_${timestamp}_${random}.png`;
            const pieceImageFilename = `piece_${timestamp}_${random}.png`;
            
            const baseImagePath = join(assetsDir, baseImageFilename);
            const pieceImagePath = join(assetsDir, pieceImageFilename);
            
            console.log(`Creating slider captcha from ${imagePath}`);
            console.log(`Puzzle position: x=${puzzleX}, y=${puzzleY}, width=${finalWidth}, height=${finalHeight}`);
            console.log(`Using puzzle shape: ${puzzleShape.name}`);
            
            // Create mask for the shape
            const maskBuffer = await this.createMaskFromSVG(puzzleShape, finalWidth, finalHeight);
            
            // Extract the region where the puzzle piece will be
            const regionBuffer = await sharp(imagePath)
                .extract({
                    left: puzzleX,
                    top: puzzleY,
                    width: finalWidth, 
                    height: finalHeight
                })
                .toBuffer();
            
            // Create the shaped puzzle piece
            const pieceBuffer = await this.createShapedPieceFromRegion(
                regionBuffer,
                maskBuffer,
                finalWidth,
                finalHeight
            );
            
            // Save the puzzle piece
            await sharp(pieceBuffer)
                .png()
                .toFile(pieceImagePath);
                
            console.log(`Created puzzle piece: ${pieceImagePath}`);
            
            // Create base image with shaped cutout
            const baseBuffer = await this.createBaseImageWithCutout(
                imagePath,
                maskBuffer,
                puzzleX,
                puzzleY
            );
            
            // Save the base image
            await sharp(baseBuffer)
                .png()
                .toFile(baseImagePath);
            
            console.log(`Created base image with cutout: ${baseImagePath}`);
            
            // Generate hashes for the images
            const baseImageHash = await this.hashImage(baseBuffer);
            const pieceImageHash = await this.hashImage(pieceBuffer);
            
            // Construct asset URLs with base URL if provided
            const { assetBaseUrl } = this.options;
            const baseImageUrl = assetBaseUrl 
                ? `${assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`}${baseImageFilename}`
                : baseImageFilename;
            
            const pieceImageUrl = assetBaseUrl
                ? `${assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`}${pieceImageFilename}`
                : pieceImageFilename;
            
            // Create the baseImage item
            const baseImage: SliderCaptchaItem = {
                hash: baseImageHash,
                data: baseImageUrl,
                type: CaptchaItemTypes.SliderBase,
            };
            
            // Create the puzzlePiece item
            const puzzlePiece: SliderCaptchaItem = {
                hash: pieceImageHash,
                data: pieceImageUrl,
                type: CaptchaItemTypes.SliderPiece,
                position: {
                    x: puzzleX,
                    y: puzzleY,
                },
            };
            
            return {
                salt: randomBytes(32).toString("hex"),
                baseImage,
                puzzlePiece,
                solved: false,
                timeLimitMs,
            };
        } catch (error) {
            console.error("Error generating slider captcha:", error);
            throw error;
        }
    }
} 