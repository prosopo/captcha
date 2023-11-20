import { CodePromise } from '@polkadot/api-contract'
import { ContractFile } from '../contract-info/common.js'
import { SignAndSendSuccessResponse, _genValidGasLimitAndValue, _signAndSend } from '@prosopo/typechain-types'
import type { ApiPromise } from '@polkadot/api'
import type { ConstructorOptions } from '@prosopo/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { WeightV2 } from '@polkadot/types/interfaces'

export default class Constructors {
    readonly nativeAPI: ApiPromise
    readonly signer: KeyringPair

    constructor(nativeAPI: ApiPromise, signer: KeyringPair) {
        this.nativeAPI = nativeAPI
        this.signer = signer
    }

    /**
     * new
     *
     */
    async new(__options?: ConstructorOptions) {
        const __contract = JSON.parse(ContractFile)
        const code = new CodePromise(this.nativeAPI, __contract, __contract.source.wasm)
        const gasLimit = (await _genValidGasLimitAndValue(this.nativeAPI, __options)).gasLimit as WeightV2

        const storageDepositLimit = __options?.storageDepositLimit
        const tx = code.tx['new']!({ gasLimit, storageDepositLimit, value: __options?.value })
        let response

        try {
            response = await _signAndSend(this.nativeAPI.registry, tx, this.signer, (event: any) => event)
        } catch (error) {
            console.log(error)
        }

        return {
            result: response as SignAndSendSuccessResponse,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            address: (response as SignAndSendSuccessResponse)!.result!.contract.address.toString(),
        }
    }
}
