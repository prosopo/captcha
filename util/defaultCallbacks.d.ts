import { type ProcaptchaRenderOptions, type ProcaptchaToken } from "@prosopo/types";
export declare const getWindowCallback: (callbackName: string) => any;
export declare const getDefaultCallbacks: (element: Element) => {
    onHuman: (token: ProcaptchaToken) => void;
    onChallengeExpired: () => void;
    onExpired: () => void;
    onError: (error: Error) => void;
    onClose: () => void;
    onOpen: () => void;
};
export declare function setUserCallbacks(renderOptions: ProcaptchaRenderOptions | undefined, callbacks: {
    onHuman: (token: ProcaptchaToken) => void;
    onChallengeExpired: () => void;
    onExpired: () => void;
    onError: (error: Error) => void;
    onClose: () => void;
    onOpen: () => void;
}, element: Element): void;
//# sourceMappingURL=defaultCallbacks.d.ts.map