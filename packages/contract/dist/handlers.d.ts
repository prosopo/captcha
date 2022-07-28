import { DispatchError } from "@polkadot/types/interfaces";
export declare class ProsopoEnvError extends Error {
    constructor(error: Error | string, context?: string, ...params: any[]);
}
export declare class ProsopoContractError extends Error {
    constructor(error: DispatchError | string, context?: string, ...params: any[]);
}
//# sourceMappingURL=handlers.d.ts.map