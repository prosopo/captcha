import {Environment} from "../env";


export interface contractApiInterface {
    env: Environment

    contractTx(contractFunction: string, args: any[], value?: number): Promise<Object>

    encodeArgs(contractFunction: string, args: any[], value?: number): any[]

    getContractMethod(contractMethodName: string): Object

    getEventNameFromMethodName(contractMethodName: string): string
}