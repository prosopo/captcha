import { join } from "path";
import { mkdir, readdir, writeFile } from "fs/promises";
import sharp from "sharp";
import { randomBytes } from "crypto";

// Interface for the slider puzzle piece and its position
interface SliderPuzzlePiece {
    x: number;
    y: number;
    width: number;
    height: number;
    buffer: Buffer;
}

/**
 * Example function that demonstrates creating a slider captcha
 * by extracting a piece from a base image and saving both
 */
async function createSliderCaptcha(sourceImagePath: string, outputDir: string): Promise<void> {
    console.log(`Processing image: ${sourceImagePath}`);
    
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });
    
    // Load the source image
    const image = sharp(sourceImagePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
        throw new Error("Could not determine image dimensions");
    }
    
    // Determine puzzle piece size (usually around 10-15% of the image size)
    const pieceWidth = Math.round(metadata.width * 0.12);
    const pieceHeight = Math.round(metadata.height * 0.15);
    
    // Select a random position for the piece, avoiding the edges
    const maxX = metadata.width - pieceWidth - 20;
    const maxY = metadata.height - pieceHeight - 20;
    const puzzleX = Math.floor(Math.random() * maxX) + 10;
    const puzzleY = Math.floor(Math.random() * maxY) + 10;
    
    console.log(`Selected puzzle piece position: (${puzzleX}, ${puzzleY})`);
    
    // Extract the puzzle piece
    const puzzlePiece = await extractPuzzlePiece(sourceImagePath, {
        x: puzzleX,
        y: puzzleY,
        width: pieceWidth,
        height: pieceHeight,
    });
    
    // Create a base image with the piece removed (create a cutout)
    const baseWithCutout = await createBaseImageWithCutout(sourceImagePath, {
        x: puzzleX,
        y: puzzleY,
        width: pieceWidth,
        height: pieceHeight,
        buffer: puzzlePiece.buffer,
    });
    
    // Generate unique filenames
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex");
    const baseImageFilename = `base_${timestamp}_${random}.png`;
    const pieceImageFilename = `piece_${timestamp}_${random}.png`;
    
    // Save the images
    await writeFile(join(outputDir, baseImageFilename), baseWithCutout);
    await writeFile(join(outputDir, pieceImageFilename), puzzlePiece.buffer);
    
    // Save the metadata for verification
    const captchaMetadata = {
        baseImage: baseImageFilename,
        puzzlePiece: pieceImageFilename,
        targetPosition: {
            x: puzzleX,
            y: puzzleY,
        },
        pieceSize: {
            width: pieceWidth,
            height: pieceHeight,
        },
        timestamp,
    };
    
    await writeFile(
        join(outputDir, `metadata_${timestamp}_${random}.json`),
        JSON.stringify(captchaMetadata, null, 2)
    );
    
    console.log(`Slider captcha created successfully!`);
    console.log(`- Base image: ${baseImageFilename}`);
    console.log(`- Puzzle piece: ${pieceImageFilename}`);
    console.log(`- Target position: (${puzzleX}, ${puzzleY})`);
}

/**
 * Extract a puzzle piece from an image
 */
async function extractPuzzlePiece(
    imagePath: string,
    region: { x: number; y: number; width: number; height: number }
): Promise<SliderPuzzlePiece> {
    // Extract the region
    const buffer = await sharp(imagePath)
        .extract({
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
        })
        // Add a semi-transparent edge to make the piece more visible
        .png({ quality: 90 })
        .toBuffer();
    
    return {
        ...region,
        buffer,
    };
}

/**
 * Create a base image with a cutout where the puzzle piece was extracted
 */
async function createBaseImageWithCutout(
    imagePath: string,
    piece: SliderPuzzlePiece
): Promise<Buffer> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
        throw new Error("Could not determine image dimensions");
    }
    
    // Create a mask (white with transparent cutout)
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
                            x="${piece.x}"
                            y="${piece.y}"
                            width="${piece.width}"
                            height="${piece.height}"
                            fill="black"
                        />
                    </svg>`
                ),
                blend: "dest-out",
            },
        ])
        .png()
        .toBuffer();
    
    // Apply the mask to create a base image with cutout
    return await sharp(imagePath)
        .composite([
            {
                input: mask,
                blend: "dest-out",
                gravity: "northwest",
            },
        ])
        .png({ quality: 90 })
        .toBuffer();
}

/**
 * Process all images in a directory
 */
async function processImageDirectory(sourceDir: string, outputDir: string): Promise<void> {
    // Get all image files
    const files = await readdir(sourceDir);
    const imageFiles = files.filter((file) => 
        file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")
    );
    
    console.log(`Found ${imageFiles.length} images to process`);
    
    // Process each image
    for (const file of imageFiles) {
        try {
            await createSliderCaptcha(join(sourceDir, file), outputDir);
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
    
    console.log("All images processed!");
}

// Example usage
async function main() {
    try {
        const sourceDir = "./source_images"; // Directory with source images
        const outputDir = "./output/slider_captchas"; // Output directory
        
        await processImageDirectory(sourceDir, outputDir);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the example
main();

// To run this example:
// 1. Create a directory "./source_images" with some image files
// 2. Run with: npx tsx src/examples/image-processing.ts 