import { Abi } from "@polkadot/api-contract";
export interface SpecDef {
    constructors: any[];
    docs: any[];
    events: any[];
    messages: {
        label: string;
        name: string[] | string;
        selector: string;
    }[];
}
export declare type AbiMetadata = {
    metadataVersion: string;
    source: {
        hash: string;
        language: string;
        compiler: string;
        wasm: string;
    };
    contract: {
        name: string;
        version: string;
        authors: string[];
    };
    spec: SpecDef;
    V1: {
        spec: SpecDef;
    };
    V2: {
        spec: SpecDef;
    };
    V3: {
        spec: SpecDef;
    };
};
export declare type ContractAbi = Record<string, unknown> | Abi;
//# sourceMappingURL=artifacts.d.ts.map