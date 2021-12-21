import {Environment} from "../env";
import { Registry } from "redspot/types/provider";


export interface contractApiInterface {
    env: Environment

    contractTx(contractFunction: string, args: any[], value?: number): Promise<Object>

    encodeArgs(contractFunction: string, args: any[], value?: number): any[]

    getContractMethod(contractMethodName: string): Object

    getEventNameFromMethodName(contractMethodName: string): string

    getStorage<T>(key: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>
}