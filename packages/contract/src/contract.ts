import { isU8a, isHex } from '@polkadot/util'
import { Registry } from 'redspot/types/provider'
import { AbiMessage } from '@polkadot/api-contract/types'
import Contract from '@redspot/patract/contract'
import { Codec } from '@polkadot/types/types'
import { ContractApiInterface, ContractTxResponse } from './types'
import { ERRORS } from './errors'
import { Environment } from './env'

export class ProsopoContractApi implements ContractApiInterface {
    env: Environment

    constructor (env) {
        this.env = env
    }

    /**
     * Perform a contract transaction calling the specified method
     * @param {string} contractMethodName
     * @param {Array}  args
     * @param {number} value    A value to send with the transaction, e.g. a stake
     * @return JSON result containing the contract event
     */
    async contractCall (contractMethodName: string, args: Array<any>, value?: number): Promise<any> {
        await this.env.isReady()
        if (!this.env.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        if (!this.env.signer) {
            throw new Error(ERRORS.CONTRACT.SIGNER_UNDEFINED.message)
        }
        const signedContract: Contract = this.env.contract.connect(this.env.signer)
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs = this.encodeArgs(methodObj, args)
        if (methodObj.isMutating) {
            return await this.contractTx(signedContract, contractMethodName, encodedArgs, value)
        }
        return await this.contractQuery(signedContract, contractMethodName, encodedArgs)
    }

    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {Contract} signedContract
     * @param {string} contractMethodName
     * @param {Array}  encodedArgs
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    async contractTx (signedContract: Contract, contractMethodName: string, encodedArgs: any[], value: number | undefined): Promise<ContractTxResponse[]> {
        let response
        if (value) {
            response = await signedContract.tx[contractMethodName](...encodedArgs, { value })
        } else {
            response = await signedContract.tx[contractMethodName](...encodedArgs)
        }
        const property = 'events'
        if (response.result.isInBlock) {
            if (response.result.status.isRetracted) {
                throw (response.status.asRetracted)
            }
            if (response.result.status.isInvalid) {
                throw (response.status.asInvalid)
            }
            const eventName = this.getEventNameFromMethodName(contractMethodName)
            if (response[property]) {
                return response[property].filter((x) => x.name === eventName)
            }
            // TODO Is there a way to get the Error enum index from ink?
        }
        return []
    }

    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {Contract} signedContract
     * @param {string} contractMethodName
     * @param {Array}  encodedArgs

     * @return JSON result containing the contract event
     */
    async contractQuery (signedContract: Contract, contractMethodName: string, encodedArgs: any[]): Promise<any> {
        const response = await signedContract.query[contractMethodName](...encodedArgs)
        if (response.result.isOk && response.output) {
            return this.unwrap(response.output)
        }
        throw (new Error(response.result.asErr.asModule.message.unwrap().toString()))
    }

    unwrap (item: Codec) {
        const prop = 'ok'
        if (prop in item) {
            return item[prop]
        }
        return item
    }

    /** Encodes arguments that should be hashes using blake2AsU8a
     * @return encoded arguments
     */
    encodeArgs (methodObj: AbiMessage, args: any[]): any[] {
        const encodedArgs: any[] = []
        // args must be in the same order as methodObj['args']
        const createTypes = ['Hash']
        methodObj.args.forEach((methodArg, idx) => {
            let argVal = args[idx]
            // hash values that have been passed as strings
            if (createTypes.indexOf(methodArg.type.type) > -1 && !(isU8a(args[idx]) || isHex(args[idx]))) {
                argVal = this.env.network.api.registry.createType(methodArg.type.type, args[idx])
            }
            encodedArgs.push(argVal)
        })
        return encodedArgs
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod (contractMethodName: string): AbiMessage {
        const methodObj = this.env.contract?.abi.messages.filter((obj) => obj.method === contractMethodName)[0] as AbiMessage
        if (methodObj) {
            return methodObj
        }
        throw (ERRORS.CONTRACT.INVALID_METHOD.message)
    }

    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey (storageName: string): string {
        // TODO there has got to be a better way to get this info
        const json: Record<string, unknown> | undefined = this.env.contract?.abi.json
        // @ts-ignore
        const storageEntry = json.V2.storage.struct.fields.filter((obj) => obj.name === storageName)[0]
        if (storageEntry) {
            return storageEntry.layout.cell.key
        }
        throw (ERRORS.CONTRACT.INVALID_STORAGE_NAME.message)
    }

    /**
     * Get the event name from the contract method name
     * Each of the ink contract methods returns an event with a capitalised version of the method name
     * @return {string} event name
     */
    // TODO use the `method` and `identifier` in the contract fragment (see redspot patract contract.ts)
    // identifier: 'dapp_register',
    // index: 6,
    // method: 'dappRegister',

    getEventNameFromMethodName (contractMethodName: string): string {
        return contractMethodName[0].toUpperCase() + contractMethodName.substring(1)
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T> (name: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T> {
        await this.env.isReady()
        const storageKey = this.getStorageKey(name)
        if (this.env.contract === undefined) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const promiseresult = await this.env.network.api.rpc.contracts.getStorage(this.env.contract.address, storageKey)
        const data = promiseresult.unwrapOrDefault()
        return decodingFn(this.env.network.registry, data)
    }
}
