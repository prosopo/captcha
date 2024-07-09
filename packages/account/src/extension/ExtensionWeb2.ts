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
import { Account, ProcaptchaClientConfigOutput } from '@prosopo/types'
import { ApiPromise } from '@polkadot/api/promise/Api'
import { Extension } from './Extension.js'
import { InjectedAccount } from '@polkadot/extension-inject/types'
import { InjectedExtension } from '@polkadot/extension-inject/types'
import { KeypairType } from '@polkadot/util-crypto/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoEnvError, hexHash } from '@prosopo/common'
import { default as Signer } from '@polkadot/extension-base/page/Signer'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto/address'
import { entropyToMnemonic } from '@polkadot/util-crypto/mnemonic/bip39'
import { hashComponents, load } from '@fingerprintjs/fingerprintjs'
import { picassoCanvas } from '@prosopo/util'
import { stringToU8a } from '@polkadot/util/string'
import { u8aToHex } from '@polkadot/util/u8a'
import { version } from '@prosopo/util'

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair }

/**
 * Class for interfacing with web3 accounts.
 */
export class ExtensionWeb2 extends Extension {
    public async getAccount(config: ProcaptchaClientConfigOutput): Promise<Account> {
        const network = this.getNetwork(config)
        console.log(network)
        const wsProvider = new WsProvider(network.endpoint)

        const account = await this.createAccount(wsProvider)
        const extension: InjectedExtension = await this.createExtension(account)

        return {
            account,
            extension,
        }
    }

    private async createExtension(account: AccountWithKeyPair): Promise<InjectedExtension> {
        const signer = new Signer(async () => {
            return
        })

        // signing carried out by the keypair. Signs the data with the private key, creating a signature. Other people can verify this signature given the message and the public key, proving that the message was indeed signed by account and proving ownership of the account.
        signer.signRaw = async (payload) => {
            const signature = account.keypair.sign(payload.data)
            return {
                id: 1, // the id of the request to sign. This should be incremented each time and adjust the signature, but we're hacking around this. Hence the signature will always be the same given the same payload.
                signature: u8aToHex(signature),
            }
        }

        return {
            accounts: {
                get: async () => {
                    // there is only ever 1 account
                    return [account]
                },
                subscribe: () => {
                    // do nothing, there will never be account changes
                    return () => {
                        return
                    }
                },
            },
            name: 'procaptcha-web2',
            version,
            signer,
        }
    }

    private async createAccount(wsProvider: WsProvider): Promise<AccountWithKeyPair> {
        const params = {
            area: { width: 300, height: 300 },
            offsetParameter: 2001000001,
            multiplier: 15000,
            fontSizeFactor: 1.5,
            maxShadowBlur: 50,
            numberOfRounds: 5,
            seed: 42,
        }

        const browserEntropy = await this.getFingerprint()
        const canvasEntropy = picassoCanvas(params.numberOfRounds, params.seed, params)
        const entropy = hexHash([canvasEntropy, browserEntropy].join(''), 128).slice(2)
        const u8Entropy = stringToU8a(entropy)
        const mnemonic = entropyToMnemonic(u8Entropy)
        const api = await ApiPromise.create({ provider: wsProvider, initWasm: false, noInitWarn: true })
        const type: KeypairType = 'ed25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })
        const keypair = keyring.addFromMnemonic(mnemonic)
        const address = keypair.address.length === 42 ? keypair.address : encodeAddress(decodeAddress(keypair.address))
        return {
            address,
            type,
            name: address,
            keypair,
        }
    }

    private async getFingerprint(): Promise<string> {
        // Initialize an agent at application startup.
        const fpPromise = load()
        // Get the visitor identifier when you need it.
        const fp = await fpPromise
        const result = await fp.get()
        // strip out the components that change in incognito mode
        const { screenFrame, ...componentsReduced } = result.components
        return hashComponents(componentsReduced)
    }

    getNetwork = (config: ProcaptchaClientConfigOutput) => {
        const network = config.networks[config.defaultNetwork]
        if (!network) {
            throw new ProsopoEnvError('DEVELOPER.NETWORK_NOT_FOUND', {
                context: { error: `No network found for environment ${config.defaultEnvironment}` },
            })
        }
        return network
    }
}
