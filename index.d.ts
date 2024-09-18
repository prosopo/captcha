import type { ProcaptchaRenderOptions } from "@prosopo/types";
export declare const render: (element: Element, renderOptions: ProcaptchaRenderOptions) => void;
export default function ready(fn: () => void): void;
declare global {
    interface Window {
        procaptcha: {
            ready: typeof ready;
            render: typeof render;
        };
    }
}
//# sourceMappingURL=index.d.ts.map