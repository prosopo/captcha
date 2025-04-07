import sharp from "sharp";
import { randomBytes } from "crypto";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import type { SliderDatasetGenerationOptions } from "../types.js";
import type { SliderCaptchaWithoutId } from "@prosopo/types";

export class SliderDatasetGenerator {
    private options: SliderDatasetGenerationOptions;

    constructor(options: SliderDatasetGenerationOptions) {
        this.options = options;
    }

    async generate(): Promise<void> {
        const { outputDir, count, baseImageDir, puzzlePieceSize, tolerance, timeLimitMs } = this.options;

        // Create output directory if it doesn't exist
        await mkdir(outputDir, { recursive: true });

        const captchas: SliderCaptchaWithoutId[] = [];

        for (let i = 0; i < count; i++) {
            const captcha = await this.generateCaptcha(baseImageDir, puzzlePieceSize, tolerance, timeLimitMs);
            captchas.push(captcha);
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
    }

    private async generateCaptcha(
        baseImageDir: string,
        puzzlePieceSize: { width: number; height: number },
        tolerance: number,
        timeLimitMs?: number
    ): Promise<SliderCaptchaWithoutId> {
        // TODO: Implement actual captcha generation logic
        // This is a placeholder implementation
        return {
            salt: randomBytes(32).toString("hex"),
            baseImage: {
                hash: randomBytes(32).toString("hex"),
                data: "baseImageUrl",
                type: "sliderBase",
            },
            puzzlePiece: {
                hash: randomBytes(32).toString("hex"),
                data: "puzzlePieceUrl",
                type: "sliderPiece",
                position: {
                    x: 0,
                    y: 0,
                },
            },
            solved: false,
            timeLimitMs,
        };
    }
} 