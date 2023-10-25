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
import { Account } from '../types/index.js'
import { ApiPromise, Keyring } from '@polkadot/api'
import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { KeypairType } from '@polkadot/util-crypto/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProcaptchaClientConfigOutput } from '@prosopo/types'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto'
import { entropyToMnemonic } from '@polkadot/util-crypto/mnemonic/bip39'
import { getNetwork } from '../modules/Manager.js'
import { hexHash } from '@prosopo/common'
import { picassoCanvas } from '../modules/canvas.js'
import { stringToU8a, u8aToHex } from '@polkadot/util'
import Extension from './Extension.js'
import FingerprintJS, { hashComponents } from '@fingerprintjs/fingerprintjs'
import Signer from '@polkadot/extension-base/page/Signer'

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair }

type PicassoParams = {
    area: {
        width: number
        height: number
    }
    offsetParameter: number
    multiplier: number
    fontSizeFactor: number
    maxShadowBlur: number
    numberOfRounds: number
    seed: number
}

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb2 extends Extension {
    public async getAccount(config: ProcaptchaClientConfigOutput): Promise<Account> {
        const account = await this.createAccount(new WsProvider(getNetwork(config).endpoint))
        const extension = await this.createExtension(account)

        return {
            account,
            extension,
        }
    }

    private async createExtension(account: AccountWithKeyPair): Promise<InjectedExtension> {
        const signer = new Signer(async () => {
            return
        })
        signer.signRaw = async (payload) => ({
            id: 1,
            signature: u8aToHex(account.keypair.sign(payload.data)),
        })
        return {
            accounts: {
                get: async () => {
                    return [account]
                },
                subscribe: () => {
                    return () => {
                        return
                    }
                },
            },
            name: 'procaptcha-web2',
            version: '0.1.11',
            signer,
        }
    }

    private async createAccount(wsProvider: WsProvider): Promise<AccountWithKeyPair> {
        const api = await ApiPromise.create({ provider: wsProvider })
        const type: KeypairType = 'sr25519'
        await cryptoWaitReady()
        const keypair = await this.generateEntropy(this.getPicassoParams()).then((entropy) =>
            this.getKeyPairFromEntropy(entropy, api, type)
        )
        const address = this.getFormattedAddress(keypair, api)
        return {
            address,
            type,
            name: address,
            keypair,
        }
    }

    private getPicassoParams() {
        return {
            area: { width: 300, height: 300 },
            offsetParameter: 2001000001,
            multiplier: 15000,
            fontSizeFactor: 1.5,
            maxShadowBlur: 50,
            numberOfRounds: 5,
            seed: 42,
        }
    }

    private async generateEntropy(params: PicassoParams): Promise<string> {
        const canvasData = picassoCanvas(params.numberOfRounds, params.seed, params)
        const fingerprint = await this.getFingerprint()
        return hexHash([canvasData, fingerprint].join(''), 128).slice(2)
    }

    private getKeyPairFromEntropy(entropy: string, api: ApiPromise, type: KeypairType): KeyringPair {
        return new Keyring({ type, ss58Format: api.registry.chainSS58 }).addFromMnemonic(
            entropyToMnemonic(stringToU8a(entropy))
        )
    }

    private getFormattedAddress(keypair: KeyringPair, api: ApiPromise): string {
        const rawAddress = keypair.address
        return rawAddress.length === 42 ? rawAddress : encodeAddress(decodeAddress(rawAddress), api.registry.chainSS58)
    }

    private getFingerprint(): Promise<string> {
        return FingerprintJS.load()
            .then((fingerprint) => fingerprint.get())
            .then((result) => hashComponents(result.components))
    }
}
