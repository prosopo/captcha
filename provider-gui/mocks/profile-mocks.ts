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
export const environmentMock = {
    CAPTCHA_WASM_PATH: './path/to/captcha.wasm',
    CAPTCHA_ABI_PATH: './path/to/captcha.json',
    DAPP_WASM_PATH: './path/to/dapp.wasm',
    DAPP_ABI_PATH: './path/to/dapp.json',
    DAPP_CONTRACT_ADDRESS: '',
    PROSOPO_CONTRACT_ADDRESS: 'PROSOPO_CONTRACT_ADDRESS',
    DATABASE_PASSWORD: 'root',
    DATABASE_USERNAME: 'root',
    DATABASE_NAME: 'prosopo',
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: '27017',
    SUBSTRATE_NODE_URL: 'ws://localhost:9944',
    API_BASE_URL: 'http://localhost:9229',
    API_PORT: '9229',
    PAIR_TYPE: 'sr25519',
    SS58_FORMAT: '42',
    PROVIDER_ADDRESS: 'PROVIDER_ADDRESS',
    PROVIDER_MNEMONIC: 'a list of about 20 words',
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
}

export const actionsMock = {
    currentStake: 123,
    isActive: true,
    isRegistered: true,
}

export const datasetMock = {
    datasetContentId: 'datasetContentId',
    datasetId: 'datasetId',
}

export const summaryMock = {
    balance: 123,
    payee: 'provider',
    status: 'active',
    url: 'https://provider.com',
    fee: 123,
}
