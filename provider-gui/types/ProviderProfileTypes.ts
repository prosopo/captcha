// Copyright 2021-2024 Prosopo (UK) Ltd.
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
export interface Environment {
    CAPTCHA_WASM_PATH: string
    CAPTCHA_ABI_PATH: string
    DAPP_WASM_PATH: string
    DAPP_ABI_PATH: string
    DAPP_CONTRACT_ADDRESS: string
    PROSOPO_CONTRACT_ADDRESS: string
    DATABASE_PASSWORD: string
    DATABASE_USERNAME: string
    DATABASE_NAME: string
    DATABASE_HOST: string
    DATABASE_PORT: string
    SUBSTRATE_NODE_URL: string
    API_BASE_URL: string
    API_PORT: string
    PAIR_TYPE: string
    SS58_FORMAT: string
    PROVIDER_ADDRESS: string
    PROVIDER_MNEMONIC: string
    NODE_ENV: string
    LOG_LEVEL: string
}

export interface Actions {
    currentStake: number
    isActive: boolean
    isRegistered: boolean
}

export interface Dataset {
    datasetContentId: string
    datasetId: string
}

export interface ProviderSummary {
    balance: number
    payee: string
    status: string
    url: string
    fee: number
}
