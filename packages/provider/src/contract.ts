import {Environment} from './env'
import {ERRORS} from './errors'
import {contractApiInterface} from "./types/contract";
import {isU8a} from '@polkadot/util'

const {blake2AsU8a} = require('@polkadot/util-crypto');

export class prosopoContractApi implements contractApiInterface {

    env: Environment

    constructor(env) {
        this.env = env;
    }

    /**
     * Perform a contract call
     *
     * @return JSON result containing the contract event
     */
    async contractTx(contractMethodName: string, args: Array<any>, value?: number): Promise<Object> {
        await this.env.isReady();
        const signedContract = this.env.contract!.connect(this.env.providerSigner!)
        const encodedArgs = this.encodeArgs(contractMethodName, args);
        let response;
        if (value) {
            response = await signedContract.tx[contractMethodName](...encodedArgs, {value: value});
        } else {
            response = await signedContract.tx[contractMethodName](...encodedArgs);
        }
        // @ts-ignore
        if (response.events) {
            const eventName = this.getEventNameFromMethodName(contractMethodName);
            return response.events.filter(x => x["name"] == eventName)
        } else {
            throw(ERRORS.CONTRACT.TX_ERROR); //TODO get the error information from response
        }
    }

    /** Encodes arguments that should be hashes using blake2AsU8a

     * @return encoded arguments
     */
    encodeArgs(contractFunction: string, args: any[], value?: number): any[] {
        const methodObj = this.getContractMethod(contractFunction);
        let encodedArgs: any[] = [];
        // args must be in the same order as methodObj['args']
        methodObj['args'].forEach(function (methodArg, idx) {
            if (methodArg['type']['type'] === 'Hash' && !isU8a(args[idx])) {
                encodedArgs.push(blake2AsU8a(args[idx]));
            } else {
                encodedArgs.push(args[idx]);
            }
        });
        return encodedArgs
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): Object {
        const methodObj = this.env.contract?.abi.messages.filter(obj => obj['method'] === contractMethodName)[0];
        if (methodObj) {
            return methodObj
        } else {
            throw (ERRORS.CONTRACT.INVALID_METHOD);
        }
    }

    /**
     * Get the event name from the contract method name
     * Each of the contract methods returns an event with a capitalised version of the method name
     * @return {string} event name
     */
    getEventNameFromMethodName(contractMethodName: string): string {
        return contractMethodName[0].toUpperCase() + contractMethodName.substring(1);
    }


    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage(key: string): Promise<any> {
        await this.env.isReady();
        const promiseresult = await this.env.network.api.rpc.contracts.getStorage(this.env.contractAddress, key);
        const data = promiseresult.unwrapOrDefault();
        let buffer = Buffer.from(data);
        // data is returned here
        console.log(buffer.readUInt8(0));
        console.log(data.toHex());
        throw "NotImplemented";
    }
}

