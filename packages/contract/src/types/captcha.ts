import {z} from "zod";

export type Dataset = {
    datasetId: string,
    captchas: Captcha[],
    format: CaptchaTypes
}

export type Captcha = {
    captchaId: string | number,
    salt: string,
}

export enum CaptchaTypes { SelectAll = "SelectAll"}

export const CaptchaSchema = z.object({
    captchaId: z.union([z.string(), z.number()]),
    salt: z.string(),
})

export const CaptchaImageSchema = z.object({
    path: z.string()
})

export const SelectAllCaptchaSchema = CaptchaSchema.extend({
        solution: z.string().array(),
        items: z.union([z.array(CaptchaImageSchema), z.string().array()]),
        target: z.string()
    }
)

export const DatasetSchema = z.object({
    datasetId: z.string(),
    captchas: z.array(SelectAllCaptchaSchema),
    format: z.nativeEnum(CaptchaTypes)
})



