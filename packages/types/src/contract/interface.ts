// import { IKeyringPair } from '@polkadot/types/types'
// import { ContractOptions } from '@polkadot/api-contract/types'
// import { Logger } from '@prosopo/common'
//
//
// export interface IProsopoCaptchaContract extends CaptchaContract {
//     contractName: string
//     pair: IKeyringPair
//     options: ContractOptions
//     nonce: number
//     logger: Logger
//
//     Generic contract functions
//
//     getContract(): IProsopoContractApi
//
//     buildExtrinsic<T>(
//         contractMethodName: string,
//         args: T[],
//         value?: number | BN | undefined
//     ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions; storageDeposit: StorageDeposit }>
//
//     contractTx<T>(
//         contractMethodName: string,
//         args: T[],
//         value?: number | BN | undefined
//     ): Promise<ContractSubmittableResult>
//
//     contractQuery(
//         contractMethodName: string,
//         args: any[],
//         value?: number | BN | undefined,
//         atBlock?: string | Uint8Array
//     ): Promise<ContractCallOutcome>
//
//     getStorage<T>(name: string): Promise<T>
// }
