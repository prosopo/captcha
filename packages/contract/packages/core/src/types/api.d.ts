import { z } from 'zod';
import { Captcha } from './captcha';
import { AnyJson } from '@polkadot/types/types/codec';
export interface CaptchaWithProof {
    captcha: Captcha;
    proof: string[][];
}
export declare type CaptchaResponse = CaptchaWithProof[];
export interface CaptchaSolutionResponse {
    captchaId: string;
    proof: string[][];
}
export declare const CaptchaSolutionBody: z.ZodObject<{
    userAccount: z.ZodString;
    dappAccount: z.ZodString;
    captchas: z.ZodArray<z.ZodObject<{
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
    requestHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    captchas: {
        captchaId: string;
        salt: string;
        solution: number[];
    }[];
    userAccount: string;
    dappAccount: string;
    requestHash: string;
}, {
    captchas: {
        captchaId: string;
        salt: string;
        solution: number[];
    }[];
    userAccount: string;
    dappAccount: string;
    requestHash: string;
}>;
export interface PendingCaptchaRequest {
    accountId: string;
    pending: boolean;
    salt: string;
}
export interface AccountsResponse {
    accounts: AnyJson;
}
