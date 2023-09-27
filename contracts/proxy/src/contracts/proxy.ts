/* This file is auto-generated */

import { Abi } from '@polkadot/api-contract'
import { ContractAbi } from '../contract-info/proxy.js'
import { ContractPromise } from '@polkadot/api-contract'
import BuildExtrinsicMethods from '../build-extrinsic/proxy.js'
import EventsClass from '../events/proxy.js'
import MixedMethods from '../mixed-methods/proxy.js'
import QueryMethods from '../query/proxy.js'
import TxSignAndSendMethods from '../tx-sign-and-send/proxy.js'
import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'

export default class Contract {
    readonly query: QueryMethods
    readonly buildExtrinsic: BuildExtrinsicMethods
    readonly tx: TxSignAndSendMethods
    readonly methods: MixedMethods
    readonly events: EventsClass

    readonly address: string
    readonly signer: KeyringPair

    readonly nativeContract: ContractPromise
    readonly nativeAPI: ApiPromise
    readonly contractAbi: Abi

    /**
	 * @constructor

	 * @param address - The address of the contract.
	 * @param signer - The signer to use for signing transactions.
	 * @param nativeAPI - The API instance to use for queries.
	*/
    constructor(address: string, signer: KeyringPair, nativeAPI: ApiPromise) {
        this.address = address
        this.nativeContract = new ContractPromise(nativeAPI, ContractAbi, address)
        this.nativeAPI = nativeAPI
        this.signer = signer
        this.contractAbi = new Abi(ContractAbi)

        this.query = new QueryMethods(this.nativeContract, this.nativeAPI, signer.address)
        this.buildExtrinsic = new BuildExtrinsicMethods(this.nativeContract, this.nativeAPI)
        this.tx = new TxSignAndSendMethods(nativeAPI, this.nativeContract, signer)
        this.methods = new MixedMethods(nativeAPI, this.nativeContract, signer)
        this.events = new EventsClass(this.nativeContract, nativeAPI)
    }

    /**
     * name
     *
     * @returns The name of the contract.
     */
    get name(): string {
        return this.nativeContract.abi.info.contract.name.toString()
    }

    /**
     * abi
     *
     * @returns The abi of the contract.
     */
    get abi(): Abi {
        return this.contractAbi
    }

    /**
     * withSigner
     *
     * @param signer - The signer to use for signing transactions.
     * @returns New instance of the contract class with new signer.
     * @example
     * ```typescript
     * const contract = new Contract(address, signerAlice, api);
     * await contract.mint(signerBob.address, 100);
     * await contract.withSigner(signerBob).transfer(signerAlice.address, 100);
     * ```
     */
    withSigner(signer: KeyringPair): Contract {
        return new Contract(this.address, signer, this.nativeAPI)
    }

    /**
     * withAddress
     *
     * @param address - The address of the contract.
     * @returns New instance of the contract class to interact with new contract.
     */
    withAddress(address: string): Contract {
        return new Contract(address, this.signer, this.nativeAPI)
    }

    /**
     * withAPI
     *
     * @param api - The API instance to use for queries.
     * @returns New instance of the contract class to interact with new API.
     */
    withAPI(api: ApiPromise): Contract {
        return new Contract(this.address, this.signer, api)
    }
}
