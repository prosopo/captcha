import { ContractPromise } from '@polkadot/api-contract'
import { IKeyringPair } from '@polkadot/types/types'
import { ContractCallOutcome, ContractOptions } from '@polkadot/api-contract/types'
import { Logger } from '@prosopo/common'
import { BN } from '@polkadot/util'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ContractLayoutStructField } from '@polkadot/types/interfaces/contractsAbi/index'

export interface IProsopoContractApi extends ContractPromise {
    contractName: string
    pair: IKeyringPair
    options: ContractOptions
    nonce: number
    logger: Logger

    // Generic contract functions

    getContract(): IProsopoContractApi

    buildExtrinsic<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions }>

    contractTx<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<ContractSubmittableResult>

    contractQuery(
        contractMethodName: string,
        args: any[],
        value?: number | BN | undefined,
        atBlock?: string | Uint8Array
    ): Promise<ContractCallOutcome>

    getStorageEntry(storageName: string): ContractLayoutStructField

    getStorage<T>(name: string, type: string): Promise<T>
}
