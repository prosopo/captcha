import { ApiPromise, Keyring } from '@polkadot/api'
import { InjectedExtension } from '@polkadot/extension-inject/types'
import { WsProvider } from '@polkadot/rpc-provider'
import { stringToU8a } from '@polkadot/util'
import { cryptoWaitReady, encodeAddress, decodeAddress } from '@polkadot/util-crypto'
import { entropyToMnemonic } from '@polkadot/util-crypto/mnemonic/bip39'
import { hexHash } from '@prosopo/datasets'
import { picassoCanvas } from '../canvas'
import Ext from './Ext'
import { Account, ProcaptchaConfig } from './Manager'
import FingerprintJS, { hashComponents } from '@fingerprintjs/fingerprintjs'
import { MessageTypesWithNullRequest } from '@polkadot/extension-base/background/types'
import Signer from '@polkadot/extension-base/page/Signer'
import { InjectedAccount } from '@polkadot/extension-inject/types'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb2 extends Ext {
    public async getAccount(config: ProcaptchaConfig): Promise<Account> {
        const wsProvider = new WsProvider(config.network.endpoint)

        const account: InjectedAccount = await this.createAccount(wsProvider)
        const extension: InjectedExtension = await this.createExtension(account)

        return {
            account,
            extension,
        }
    }

    private async createExtension(account: InjectedAccount): Promise<InjectedExtension> {

        const sendMessage = async <TMessageType extends MessageTypesWithNullRequest, TResponse>(
            message: TMessageType
        ): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                resolve()
            })
        }

        await sendMessage('pub(authorize.tab)' as MessageTypesWithNullRequest)
        const signer = new Signer(sendMessage)

        return {
            accounts: {
                get: async () => {
                    // there is only ever 1 account
                    return [account]
                },
                subscribe: () => {
                    // do nothing, there will never be account changes
                    return () => {}
                },
            },
            name: 'procaptcha-web2',
            version: '0.0.1',
            signer
        }
    }


    private async createAccount(wsProvider: WsProvider): Promise<InjectedAccount> {
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
        const type = 'sr25519'
        const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 })

        await cryptoWaitReady()
        const account = keyring.addFromMnemonic(mnemonic)
        const address = account.address.length === 42 ? account.address : encodeAddress(decodeAddress(account.address))
        return {
            address,
            type,
            name: address,
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
