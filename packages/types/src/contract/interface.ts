// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// import { IKeyringPair } from '@polkadot/types/types'
// import { ContractOptions } from '@polkadot/api-contract/types'
// import { Logger } from '@prosopo/common'
//
//
// export interface IProsopoCaptchaContract {
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
