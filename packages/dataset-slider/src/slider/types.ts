export interface SliderCaptchaItem {
    hash: string;
    data: string;
    type: "sliderBase" | "sliderPiece";
    position?: {
        x: number;
        y: number;
    };
}

export interface SliderCaptchaWithoutId {
    salt: string;
    baseImage: SliderCaptchaItem;
    puzzlePiece: SliderCaptchaItem;
    solved?: boolean;
    timeLimitMs?: number;
}

export interface SliderCaptcha extends SliderCaptchaWithoutId {
    captchaId: string;
    captchaContentId: string;
    assetURI?: string;
    datasetId?: string;
    datasetContentId?: string;
} 