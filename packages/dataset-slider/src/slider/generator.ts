import sharp from "sharp";
import { randomBytes } from "crypto";
import { join, resolve } from "path";
import { mkdir, writeFile, readdir, access } from "fs/promises";
import { createHash } from "crypto";
import type { SliderDatasetGenerationOptions } from "../types.js";
import { CaptchaItemTypes, type SliderCaptchaWithoutId, type SliderCaptchaItem } from "@prosopo/types";

export class SliderDatasetGenerator {
    private options: SliderDatasetGenerationOptions;

    constructor(options: SliderDatasetGenerationOptions) {
        this.options = options;
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

    private async generateCaptcha(
        imagePath: string,
        assetsDir: string,
        puzzlePieceSize: { width: number; height: number },
        tolerance: number,
        timeLimitMs?: number
    ): Promise<SliderCaptchaWithoutId> {
        // Load the image
        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        if (!metadata.width || !metadata.height) {
            throw new Error("Could not determine image dimensions");
        }
        
        // If puzzlePieceSize dimensions are percentages, convert to pixels
        const pieceWidth = puzzlePieceSize.width;
        const pieceHeight = puzzlePieceSize.height;
        
        // Choose a random position for the puzzle piece, avoiding the edges
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
        const pieceBuffer = await sharp(imagePath)
            .extract({
                left: puzzleX,
                top: puzzleY,
                width: pieceWidth,
                height: pieceHeight,
            })
            .png({ quality: 90 })
            .toBuffer();
            
        await sharp(pieceBuffer)
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
        const baseBuffer = await sharp(imagePath)
            .composite([
                {
                    input: mask,
                    blend: "dest-out",
                    gravity: "northwest",
                },
            ])
            .png({ quality: 90 })
            .toBuffer();
            
        await sharp(baseBuffer)
            .toFile(baseImagePath);
        
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
    }
} 