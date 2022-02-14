import { z } from 'zod';
import { AccountId, Hash } from '@polkadot/types/interfaces';
export declare enum CaptchaTypes {
    SelectAll = "SelectAll"
}
export declare enum CaptchaItemTypes {
    Text = "text",
    Image = "image"
}
export declare type CaptchaWithoutId = {
    salt: string;
    items: any[];
    target: string;
    solution?: any;
};
export interface Captcha extends CaptchaWithoutId {
    captchaId: string;
}
export declare type Dataset = {
    datasetId?: Hash | string | Uint8Array;
    captchas: CaptchaWithoutId[] | Captcha[];
    format: CaptchaTypes;
    tree?: string[][];
};
export declare type DatasetWithIds = {
    datasetId?: Hash | string | Uint8Array;
    captchas: Captcha[];
    format: CaptchaTypes;
    tree?: string[][];
};
export interface DatasetWithIdsAndTree extends DatasetWithIds {
    tree: string[][];
}
export declare enum CaptchaStatus {
    Pending = "Pending",
    Approved = "Approved",
    Disapproved = "Disapproved"
}
export interface CaptchaSolutionCommitment {
    account: AccountId;
    captchaDatasetId: Hash;
    status: CaptchaStatus;
    contract: AccountId;
    provider: AccountId;
}
export declare type CaptchaSolution = {
    captchaId: string;
    salt: string;
    solution: number[];
};
export declare type CaptchaConfig = {
    solved: {
        count: number;
    };
    unsolved: {
        count: number;
    };
};
export declare const CaptchaSchema: z.ZodObject<{
    captchaId: z.ZodUnion<[z.ZodString, z.ZodUndefined]>;
    salt: z.ZodString;
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
}, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
}>;
export declare const CaptchaWithIdSchema: z.ZodObject<{
    captchaId: z.ZodString;
    salt: z.ZodString;
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    solution?: number[] | undefined;
    captchaId: string;
    salt: string;
}, {
    solution?: number[] | undefined;
    captchaId: string;
    salt: string;
}>;
export declare const CaptchaWithIdAndSolutionSchema: z.ZodObject<{
    captchaId: z.ZodString;
    salt: z.ZodString;
    solution: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    captchaId: string;
    salt: string;
    solution: number[];
}, {
    captchaId: string;
    salt: string;
    solution: number[];
}>;
export declare const CaptchaImageSchema: z.ZodObject<{
    path: z.ZodString;
    type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: CaptchaItemTypes;
}, {
    path: string;
    type: CaptchaItemTypes;
}>;
export declare const CaptchaTextSchema: z.ZodObject<{
    text: z.ZodString;
    type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
}, "strip", z.ZodTypeAny, {
    type: CaptchaItemTypes;
    text: string;
}, {
    type: CaptchaItemTypes;
    text: string;
}>;
export declare const SelectAllCaptchaSchema: z.ZodObject<z.extendShape<{
    captchaId: z.ZodUnion<[z.ZodString, z.ZodUndefined]>;
    salt: z.ZodString;
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, {
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    items: z.ZodUnion<[z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: CaptchaItemTypes;
    }, {
        path: string;
        type: CaptchaItemTypes;
    }>, "many">, z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        type: CaptchaItemTypes;
        text: string;
    }, {
        type: CaptchaItemTypes;
        text: string;
    }>, "many">]>;
    target: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
    items: {
        path: string;
        type: CaptchaItemTypes;
    }[] | {
        type: CaptchaItemTypes;
        text: string;
    }[];
    target: string;
}, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
    items: {
        path: string;
        type: CaptchaItemTypes;
    }[] | {
        type: CaptchaItemTypes;
        text: string;
    }[];
    target: string;
}>;
export declare const SelectAllSolvedCaptchaSchema: z.ZodObject<z.extendShape<{
    captchaId: z.ZodString;
    salt: z.ZodString;
    solution: z.ZodArray<z.ZodNumber, "many">;
}, {
    solution: z.ZodArray<z.ZodNumber, "many">;
    items: z.ZodUnion<[z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: CaptchaItemTypes;
    }, {
        path: string;
        type: CaptchaItemTypes;
    }>, "many">, z.ZodArray<z.ZodString, "many">]>;
    target: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    captchaId: string;
    salt: string;
    solution: number[];
    items: string[] | {
        path: string;
        type: CaptchaItemTypes;
    }[];
    target: string;
}, {
    captchaId: string;
    salt: string;
    solution: number[];
    items: string[] | {
        path: string;
        type: CaptchaItemTypes;
    }[];
    target: string;
}>;
export declare const CaptchasSchema: z.ZodArray<z.ZodObject<z.extendShape<{
    captchaId: z.ZodUnion<[z.ZodString, z.ZodUndefined]>;
    salt: z.ZodString;
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, {
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    items: z.ZodUnion<[z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: CaptchaItemTypes;
    }, {
        path: string;
        type: CaptchaItemTypes;
    }>, "many">, z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        type: CaptchaItemTypes;
        text: string;
    }, {
        type: CaptchaItemTypes;
        text: string;
    }>, "many">]>;
    target: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
    items: {
        path: string;
        type: CaptchaItemTypes;
    }[] | {
        type: CaptchaItemTypes;
        text: string;
    }[];
    target: string;
}, {
    captchaId?: string | undefined;
    solution?: number[] | undefined;
    salt: string;
    items: {
        path: string;
        type: CaptchaItemTypes;
    }[] | {
        type: CaptchaItemTypes;
        text: string;
    }[];
    target: string;
}>, "many">;
export declare const CaptchasWithIdSchema: z.ZodArray<z.ZodObject<{
    captchaId: z.ZodString;
    salt: z.ZodString;
    solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    solution?: number[] | undefined;
    captchaId: string;
    salt: string;
}, {
    solution?: number[] | undefined;
    captchaId: string;
    salt: string;
}>, "many">;
export declare const CaptchaSolution: z.ZodObject<{
    captchaId: z.ZodString;
    solution: z.ZodArray<z.ZodNumber, "many">;
    salt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    captchaId: string;
    salt: string;
    solution: number[];
}, {
    captchaId: string;
    salt: string;
    solution: number[];
}>;
export declare const CaptchaSolutionSchema: z.ZodArray<z.ZodObject<{
    captchaId: z.ZodString;
    solution: z.ZodArray<z.ZodNumber, "many">;
    salt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    captchaId: string;
    salt: string;
    solution: number[];
}, {
    captchaId: string;
    salt: string;
    solution: number[];
}>, "many">;
export declare const CaptchasSolvedSchema: z.ZodArray<z.ZodObject<z.extendShape<{
    captchaId: z.ZodString;
    salt: z.ZodString;
    solution: z.ZodArray<z.ZodNumber, "many">;
}, {
    solution: z.ZodArray<z.ZodNumber, "many">;
    items: z.ZodUnion<[z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        type: CaptchaItemTypes;
    }, {
        path: string;
        type: CaptchaItemTypes;
    }>, "many">, z.ZodArray<z.ZodString, "many">]>;
    target: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    captchaId: string;
    salt: string;
    solution: number[];
    items: string[] | {
        path: string;
        type: CaptchaItemTypes;
    }[];
    target: string;
}, {
    captchaId: string;
    salt: string;
    solution: number[];
    items: string[] | {
        path: string;
        type: CaptchaItemTypes;
    }[];
    target: string;
}>, "many">;
export declare const DatasetSchema: z.ZodObject<{
    datasetId: z.ZodOptional<z.ZodString>;
    captchas: z.ZodArray<z.ZodObject<z.extendShape<{
        captchaId: z.ZodUnion<[z.ZodString, z.ZodUndefined]>;
        salt: z.ZodString;
        solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, {
        solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        items: z.ZodUnion<[z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            type: CaptchaItemTypes;
        }, {
            path: string;
            type: CaptchaItemTypes;
        }>, "many">, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            type: z.ZodNativeEnum<typeof CaptchaItemTypes>;
        }, "strip", z.ZodTypeAny, {
            type: CaptchaItemTypes;
            text: string;
        }, {
            type: CaptchaItemTypes;
            text: string;
        }>, "many">]>;
        target: z.ZodString;
    }>, "strip", z.ZodTypeAny, {
        captchaId?: string | undefined;
        solution?: number[] | undefined;
        salt: string;
        items: {
            path: string;
            type: CaptchaItemTypes;
        }[] | {
            type: CaptchaItemTypes;
            text: string;
        }[];
        target: string;
    }, {
        captchaId?: string | undefined;
        solution?: number[] | undefined;
        salt: string;
        items: {
            path: string;
            type: CaptchaItemTypes;
        }[] | {
            type: CaptchaItemTypes;
            text: string;
        }[];
        target: string;
    }>, "many">;
    format: z.ZodNativeEnum<typeof CaptchaTypes>;
    tree: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">>;
}, "strip", z.ZodTypeAny, {
    datasetId?: string | undefined;
    tree?: string[][] | undefined;
    captchas: {
        captchaId?: string | undefined;
        solution?: number[] | undefined;
        salt: string;
        items: {
            path: string;
            type: CaptchaItemTypes;
        }[] | {
            type: CaptchaItemTypes;
            text: string;
        }[];
        target: string;
    }[];
    format: CaptchaTypes.SelectAll;
}, {
    datasetId?: string | undefined;
    tree?: string[][] | undefined;
    captchas: {
        captchaId?: string | undefined;
        solution?: number[] | undefined;
        salt: string;
        items: {
            path: string;
            type: CaptchaItemTypes;
        }[] | {
            type: CaptchaItemTypes;
            text: string;
        }[];
        target: string;
    }[];
    format: CaptchaTypes.SelectAll;
}>;
export declare const DatasetWithIdsSchema: z.ZodObject<{
    datasetId: z.ZodString;
    captchas: z.ZodArray<z.ZodObject<{
        captchaId: z.ZodString;
        salt: z.ZodString;
        solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }, {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }>, "many">;
    format: z.ZodNativeEnum<typeof CaptchaTypes>;
    tree: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">>;
}, "strip", z.ZodTypeAny, {
    tree?: string[][] | undefined;
    datasetId: string;
    captchas: {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }[];
    format: CaptchaTypes.SelectAll;
}, {
    tree?: string[][] | undefined;
    datasetId: string;
    captchas: {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }[];
    format: CaptchaTypes.SelectAll;
}>;
export declare const DatasetWithIdsAndTreeSchema: z.ZodObject<z.extendShape<{
    datasetId: z.ZodString;
    captchas: z.ZodArray<z.ZodObject<{
        captchaId: z.ZodString;
        salt: z.ZodString;
        solution: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }, {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }>, "many">;
    format: z.ZodNativeEnum<typeof CaptchaTypes>;
    tree: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">>;
}, {
    tree: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
}>, "strip", z.ZodTypeAny, {
    datasetId: string;
    captchas: {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }[];
    format: CaptchaTypes.SelectAll;
    tree: string[][];
}, {
    datasetId: string;
    captchas: {
        solution?: number[] | undefined;
        captchaId: string;
        salt: string;
    }[];
    format: CaptchaTypes.SelectAll;
    tree: string[][];
}>;
