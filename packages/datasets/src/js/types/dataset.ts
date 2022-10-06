

import {HexString} from "@polkadot/util/types";
import {
    Captcha,
    CaptchasSchema,
    CaptchaTypes,
    CaptchaWithoutId,
    CaptchaWithoutIdRaw,
    SelectAllCaptchaSchema
} from "./captcha";
import {z} from "zod";


type DatasetBase = {
    datasetId?: HexString | string | null;
    datasetContentId?: HexString | string | null;
    format: CaptchaTypes;
    contentTree?: string[][];
    solutionTree?: string[][];
};

export interface Dataset extends DatasetBase {
    captchas: CaptchaWithoutId[] | Captcha[];
}

export interface DatasetRaw extends DatasetBase {
    captchas: CaptchaWithoutIdRaw[];
}

export type DatasetWithIds = {
    datasetId: HexString | string,
    datasetContentId: HexString | string | null;
    captchas: Captcha[],
    format: CaptchaTypes,
    contentTree?: string[][],
    solutionTree?: string[][]
}

export interface DatasetWithIdsAndTree extends DatasetWithIds {
    contentTree: string[][]
}

// Zod schemas

export const DatasetSchema = z.object({
    datasetId: z.string().optional(),
    datasetContentId: z.string().optional(),
    captchas: CaptchasSchema,
    format: z.nativeEnum(CaptchaTypes),
    solutionTree: z.array(z.array(z.string())).optional(),
    contentTree: z.array(z.array(z.string())).optional(),
    timeLimit: z.number().optional(),
})

export const DatasetWithIdsSchema = z.object({
    datasetId: z.string(),
    datasetContentId: z.string().optional(),
    captchas: z.array(SelectAllCaptchaSchema),
    format: z.nativeEnum(CaptchaTypes),
    solutionTree: z.array(z.array(z.string())).optional(),
    contentTree: z.array(z.array(z.string())).optional()
})

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
    solutionTree: z.array(z.array(z.string())),
    contentTree: z.array(z.array(z.string()))
})
