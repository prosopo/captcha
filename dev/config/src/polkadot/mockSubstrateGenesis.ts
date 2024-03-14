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
export const knownGenesis = {
    kusama: [
        '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        '0xe3777fa922cafbff200cadeaea1a76bd7898ad5b89f7848999058b50e715f636',
        '0x3fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf',
    ],
    polkadot: ['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'],
    rococo: [
        '0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e',
        '0xaaf2cd1b74b5f726895921259421b534124726263982522174147046b8827897',
        '0x037f5f3c8e67b314062025fc886fcd6238ea25a4a9b45dce8d246815c9ebe770',
        '0xc196f81260cf1686172b47a79cf002120735d7cb0eb1474e8adce56618456fff',
        '0xf6e9983c37baf68846fedafe21e56718790e39fb1c582abc408b81bc7b208f9a',
        '0x5fce687da39305dfe682b117f0820b319348e8bb37eb16cf34acbf6a202de9d9',
        '0xe7c3d5edde7db964317cd9b51a3a059d7cd99f81bdbce14990047354334c9779',
        '0x1611e1dbf0405379b861e2e27daa90f480b2e6d3682414a80835a52e8cb8a215',
        '0x343442f12fa715489a8714e79a7b264ea88c0d5b8c66b684a7788a516032f6b9',
        '0x78bcd530c6b3a068bc17473cf5d2aff9c287102bed9af3ae3c41c33b9d6c6147',
        '0x47381ee0697153d64404fc578392c8fd5cba9073391908f46c888498415647bd',
        '0x19c0e4fa8ab75f5ac7865e0b8f74ff91eb9a100d336f423cd013a8befba40299',
    ],
    westend: ['0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e'],
}
export const knownIcon = {
    centrifuge: 'polkadot',
    kusama: 'polkadot',
    polkadot: 'polkadot',
    sora: 'polkadot',
    statemine: 'polkadot',
    statemint: 'polkadot',
    westmint: 'polkadot',
}
export const knownLedger = {
    kusama: 434,
    polkadot: 354,
}
export const knownTestnet = {
    '': true,
    'cess-testnet': true,
    'dock-testnet': true,
    jupiter: true,
    'mathchain-testnet': true,
    p3dt: true,
    subspace_testnet: true,
    'zero-alphaville': true,
}
