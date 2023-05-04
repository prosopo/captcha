import { ApiPromise, Keyring } from '@polkadot/api'
import { InjectedExtension } from '@polkadot/extension-inject/types'
import { WsProvider } from '@polkadot/rpc-provider'
import { stringToU8a, u8aToHex } from '@polkadot/util'
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto'
import { entropyToMnemonic } from '@polkadot/util-crypto/mnemonic/bip39'
import { hexHash } from '@prosopo/datasets'
import Extension from './Extension'
import FingerprintJS, { hashComponents } from '@fingerprintjs/fingerprintjs'
import Signer from '@polkadot/extension-base/page/Signer'
import { InjectedAccount } from '@polkadot/extension-inject/types'
import { Account, ProcaptchaConfig } from '../types'
import { picassoCanvas } from '../modules/canvas'
import { KeypairType } from '@polkadot/util-crypto/types'
import { KeyringPair } from '@polkadot/keyring/types'

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair }

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb2 extends Extension {
    public async getAccount(config: ProcaptchaConfig): Promise<Account> {
        const wsProvider = new WsProvider(config.network.endpoint)

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
            version: '0.1.11',
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
        console.log('canvas entropy', canvasEntropy)
        console.log('browserEntropy', browserEntropy)
        console.log('entropy', entropy)
        const u8Entropy = stringToU8a(entropy)
        const mnemonic = entropyToMnemonic(u8Entropy)

        const api = await ApiPromise.create({ provider: wsProvider })
        const type: KeypairType = 'sr25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })

        await cryptoWaitReady()
        const keypair = keyring.addFromMnemonic(mnemonic)
        const address =
            keypair.address.length === 42
                ? keypair.address
                : encodeAddress(decodeAddress(keypair.address), api.registry.chainSS58)
        return {
            address,
            type,
            name: address,
            keypair,
        }
    }

    private async getFingerprint(): Promise<string> {
        // Initialize an agent at application startup.
        const fpPromise = FingerprintJS.load()
        // Get the visitor identifier when you need it.
        const fp = await fpPromise
        const result = await fp.get()
        // strip out the components that change in incognito mode
        const { screenFrame, ...componentsReduced } = result.components
        return hashComponents(componentsReduced)
    }
}
