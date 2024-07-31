import { Features, ProcaptchaToken } from '@prosopo/types';
interface ProcaptchaRenderOptions {
    siteKey: string;
    theme?: 'light' | 'dark';
    captchaType?: Features;
    callback?: string | ((token: ProcaptchaToken) => void);
    'challenge-valid-length'?: string;
    'chalexpired-callback'?: string | (() => void);
    'expired-callback'?: string | (() => void);
    'open-callback'?: string | (() => void);
    'close-callback'?: string | (() => void);
    'error-callback'?: string | (() => void);
}
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
export {};
//# sourceMappingURL=index.d.ts.map