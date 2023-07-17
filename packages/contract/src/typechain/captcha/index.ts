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
// export * from './build-extrinsic'
// export * from './constructors'
// export * from './contract-info'
export * from './contracts'
import { ContractAbi } from './contract-info'
export const abiJson = JSON.parse(ContractAbi)
// export * from './event-data'
// export * from './event-types'
// export * from './events'
// export * from './mixed-methods'
// export * from './query'
// export * from './shared'
// export * from './tx-sign-and-send'
// export * from './types-arguments'
// export * from './types-returns'
