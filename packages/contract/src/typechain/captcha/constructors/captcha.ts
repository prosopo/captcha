import { CodePromise } from '@polkadot/api-contract'
import { ContractFile } from '../contract-info/captcha'
import { SignAndSendSuccessResponse, _genValidGasLimitAndValue, _signAndSend } from '@727-ventures/typechain-types'
import type { ApiPromise } from '@polkadot/api'
import type { ConstructorOptions } from '@727-ventures/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { WeightV2 } from '@polkadot/types/interfaces'
import type BN from 'bn.js'

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
     * @param { (string | number | BN) } providerStakeThreshold,
     * @param { (string | number | BN) } dappStakeThreshold,
     * @param { (number | string | BN) } maxUserHistoryLen,
     * @param { (number | string | BN) } maxUserHistoryAge,
     * @param { (number | string | BN) } minNumActiveProviders,
     * @param { (string | number | BN) } maxProviderFee,
     */
    async new(
        providerStakeThreshold: string | number | BN,
        dappStakeThreshold: string | number | BN,
        maxUserHistoryLen: number | string | BN,
        maxUserHistoryAge: number | string | BN,
        minNumActiveProviders: number | string | BN,
        maxProviderFee: string | number | BN,
        __options?: ConstructorOptions
    ) {
        const __contract = JSON.parse(ContractFile)
        const code = new CodePromise(this.nativeAPI, __contract, __contract.source.wasm)
        const gasLimit = (await _genValidGasLimitAndValue(this.nativeAPI, __options)).gasLimit as WeightV2

        const storageDepositLimit = __options?.storageDepositLimit
        const tx = code.tx['new']!(
            { gasLimit, storageDepositLimit, value: __options?.value },
            providerStakeThreshold,
            dappStakeThreshold,
            maxUserHistoryLen,
            maxUserHistoryAge,
            minNumActiveProviders,
            maxProviderFee
        )
        let response

        try {
            response = await _signAndSend(this.nativeAPI.registry, tx, this.signer, (event: any) => event)
        } catch (error) {
            console.log(error)
        }

        return {
            result: response as SignAndSendSuccessResponse,
            // @ts-ignore
            address: (response as SignAndSendSuccessResponse)!.result!.contract.address.toString(),
        }
    }
}
