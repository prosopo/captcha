import type { SliderCaptcha, SliderCaptchaWithoutId, SliderCaptchaItem } from "@prosopo/types";

export interface SliderDataset {
    datasetId: string;
    captchas: SliderCaptchaWithoutId[];
    format: "slider";
}

export interface SliderDatasetWithIds {
    datasetId: string;
    captchas: SliderCaptcha[];
    format: "slider";
}

export interface SliderDatasetGenerationOptions {
    outputDir: string;
    count: number;
    baseImageDir: string;
    puzzlePieceSize: {
        width: number;
        height: number;
    };
    tolerance: number;
    timeLimitMs?: number;
    /**
     * Optional base URL to prepend to asset filenames.
     * For local development, this can be:
     * - An absolute file path: "file:///path/to/assets/"
     * - A relative path: "./assets/"
     * - A web URL: "https://example.com/assets/"
     */
    assetBaseUrl?: string;
    /**
     * Optional shape name to use for all puzzle pieces.
     * If not provided, shapes will be randomly selected.
     * See the PUZZLE_SHAPES array for available shape names.
     */
    selectedShapeName?: string;
} 