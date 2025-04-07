import type { SliderCaptcha, SliderCaptchaWithoutId } from "@prosopo/types";

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
} 