import { type ProcaptchaClientConfigOutput } from "@prosopo/types";
export declare const getConfig: (siteKey?: string) => ProcaptchaClientConfigOutput;
export declare const getProcaptchaScript: (name: string) => HTMLScriptElement | null;
export declare const extractParams: (name: string) => {
    onloadUrlCallback: string | undefined;
    renderExplicit: string | undefined;
};
//# sourceMappingURL=config.d.ts.map