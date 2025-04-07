import type { SliderDataset } from "../types.js";

export class SliderDatasetValidator {
    validate(dataset: SliderDataset): boolean {
        // Validate dataset format
        if (dataset.format !== "slider") {
            return false;
        }

        // Validate dataset ID
        if (!dataset.datasetId || typeof dataset.datasetId !== "string") {
            return false;
        }

        // Validate captchas array
        if (!Array.isArray(dataset.captchas)) {
            return false;
        }

        // Validate each captcha
        for (const captcha of dataset.captchas) {
            if (!this.validateCaptcha(captcha)) {
                return false;
            }
        }

        return true;
    }

    private validateCaptcha(captcha: SliderDataset["captchas"][0]): boolean {
        // Validate salt
        if (!captcha.salt || typeof captcha.salt !== "string") {
            return false;
        }

        // Validate base image
        if (!this.validateCaptchaItem(captcha.baseImage)) {
            return false;
        }

        // Validate puzzle piece
        if (!this.validateCaptchaItem(captcha.puzzlePiece)) {
            return false;
        }

        // Validate time limit if present
        if (captcha.timeLimitMs !== undefined && typeof captcha.timeLimitMs !== "number") {
            return false;
        }

        return true;
    }

    private validateCaptchaItem(item: { hash: string; data: string; type: string }): boolean {
        if (!item.hash || typeof item.hash !== "string") {
            return false;
        }

        if (!item.data || typeof item.data !== "string") {
            return false;
        }

        if (!item.type || typeof item.type !== "string") {
            return false;
        }

        return true;
    }
} 