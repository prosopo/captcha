import { ProsopoEnvironment } from "@prosopo/provider-core/types";
export declare function processArgs(args: any, env: ProsopoEnvironment): {
    [x: string]: unknown;
    value: number;
    fee: number;
    payee: string;
    api: boolean;
    serviceOrigin: string;
    file: string;
    address: string;
    _: (string | number)[];
    $0: string;
} | Promise<{
    [x: string]: unknown;
    value: number;
    fee: number;
    payee: string;
    api: boolean;
    serviceOrigin: string;
    file: string;
    address: string;
    _: (string | number)[];
    $0: string;
}>;
