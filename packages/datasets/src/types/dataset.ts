

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

export enum DatasetTreeType {ContentOnly = 'contentOnly', ContentAndSolution = 'contentAndSolution'}

type DatasetBase = {
    datasetId?: HexString | string | null;
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
    captchas: CaptchasSchema,
    format: z.nativeEnum(CaptchaTypes),
    tree: z.array(z.array(z.string())).optional(),
    timeLimit: z.number().optional(),
    treeType: z.nativeEnum(DatasetTreeType).optional()
})

export const DatasetWithIdsSchema = z.object({
    datasetId: z.string(),
    captchas: z.array(SelectAllCaptchaSchema),
    format: z.nativeEnum(CaptchaTypes),
    tree: z.array(z.array(z.string())).optional()
})

export const DatasetWithIdsAndTreeSchema = DatasetWithIdsSchema.extend({
    tree: z.array(z.array(z.string()))
})
