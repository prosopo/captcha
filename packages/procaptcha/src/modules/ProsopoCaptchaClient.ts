// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import {
    CaptchaEventCallbacks,
    ICaptchaContextReducer,
    ICaptchaStatusReducer,
    IExtensionInterface,
    TExtensionAccount,
} from '../types/client'
import { ProposoProvider, ProsopoRandomProviderResponse } from '../types/api'
import { ProsopoContract } from '../api/ProsopoContract'
import { getProsopoContract, getWsProvider } from './contract'
import { getExtension } from './extension'
import { ProviderApi } from '@prosopo/api'
import { ProsopoCaptchaApi } from './ProsopoCaptchaApi'
import { ProsopoEnvError } from '@prosopo/contract'
import { hexToString } from '@polkadot/util'
import storage from './storage'

export class ProsopoCaptchaClient {
    public status: ICaptchaStatusReducer
    public providerUrl: string | undefined
    manager: ICaptchaContextReducer
    callbacks: CaptchaEventCallbacks | undefined
    providerApi: ProviderApi | undefined

    private _extension?: IExtensionInterface
    private _contract?: ProsopoContract
    private _provider?: ProsopoRandomProviderResponse
    private _captchaApi?: ProsopoCaptchaApi

    constructor(manager: ICaptchaContextReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager
        this.callbacks = callbacks
        this._extension = manager.state.extension
        this._contract = manager.state.contract
        this._provider = manager.state.provider
        this._captchaApi = manager.state.captchaApi
    }

    get extension() {
        return this._extension
    }

    set extension(extension) {
        this._extension = extension
        this.manager.update({ extension })
    }

    get contract() {
        return this._contract
    }

    set contract(contract) {
        this._contract = contract
        this.manager.update({ contract })
    }

    get provider() {
        return this._provider
    }

    set provider(provider) {
        this._provider = provider
        this.manager.update({ provider })
    }

    get captchaApi() {
        return this._captchaApi
    }

    set captchaApi(captchaApi) {
        this._captchaApi = captchaApi
        this.manager.update({ captchaApi })
    }

    public getProviderApi(providerUrl: string) {
        return new ProviderApi(
            this.manager.state.config.networks[this.manager.state.config.defaultEnvironment],
            providerUrl
        )
    }

    public async onLoad(onHuman, createAccount?: boolean) {
        console.log('Captcha client onLoad, createAccount:', createAccount)
        if (!this.extension) {
            try {
                const ext = await getExtension(
                    getWsProvider(this.manager.state.config['dappUrl']),
                    this.manager.state.config['web2'],
                    this.manager.state.config['accountCreator'],
                    this.manager.state.config['dappName']
                )
                console.log(ext)
                this.extension = ext
                console.log(this.extension)
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }
        console.log('Extension loaded')
        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(this.extension, this.manager.state.config['prosopoContractAccount'])
            this.manager.update({ contractAddress: this.manager.state.config['prosopoContractAccount'] })
        }

        let account: TExtensionAccount | undefined
        if (createAccount) {
            console.log('creating account')
            try {
                console.log(this.extension)
                account = await this.extension.createAccount()
                console.log(account)
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        } else {
            try {
                account = await this.extension.getAccount()
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }

        if (account) {
            await this.onAccountChange(account)
        }
    }

    public async onAccountChange(account?: TExtensionAccount) {
        console.log('onAccountChange', account)
        if (!account) {
            this.onAccountUnset()
            return
        }

        try {
            this.extension?.setAccount(account.address)
        } catch (err) {
            throw new ProsopoEnvError(err)
        }

        this.contract = await this.initContract(account)

        const isHuman = await this.contract.dappOperatorIsHumanUser(this.manager.state.config['solutionThreshold'])

        // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
        if (isHuman && this.callbacks?.onSolved) {
            await this.callbacks?.onSolved(account, undefined, undefined)
        }

        // Check if there is a provider in local storage or get a random one from the contract
        const provider = storage.getProvider()
        if (provider) {
            this.provider = provider
        } else {
            this.provider = await this.contract.getRandomProvider()
        }

        if (!this.provider) {
            throw new ProsopoEnvError('DEVELOPER.PROVIDER_NOT_FOUND')
        }

        storage.setProvider(this.provider)

        this.providerUrl = ProsopoCaptchaClient.trimProviderUrl(this.provider.provider)

        this.providerApi = this.getProviderApi(this.providerUrl)

        const verifyDappUserResponse = await this.providerApi.verifyDappUser(account.address, undefined)

        this.captchaApi = new ProsopoCaptchaApi(
            account.address,
            this.contract,
            this.provider,
            this.providerApi,
            this.manager.state.config['web2']
        )

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account)
        }

        this.manager.update({ account, providerUrl: this.providerUrl })

        console.log('providerUrl', this.providerUrl)

        if (this.callbacks?.onSolved && verifyDappUserResponse.solutionApproved) {
            this.callbacks?.onSolved(account, undefined, verifyDappUserResponse)
        }
    }

    public onAccountUnset() {
        this.contract = undefined
        this.provider = undefined
        this.captchaApi = undefined

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(undefined)
        }

        this.manager.update({ account: undefined })
    }

    private async initContract(account: TExtensionAccount): Promise<ProsopoContract> {
        const defaultEnvironment = this.manager.state.config.defaultEnvironment
        try {
            return await getProsopoContract(
                this.manager.state.config.networks[defaultEnvironment].prosopoContract.address,
                this.manager.state.config.networks[defaultEnvironment].dappContract.address,
                account,
                getWsProvider(this.manager.state.config.networks[defaultEnvironment].endpoint)
            )
        } catch (err) {
            throw new ProsopoEnvError(err)
        }
    }

    private static trimProviderUrl(provider: ProposoProvider) {
        return hexToString(provider.serviceOrigin).replace(/\0/g, '')
    }
}

export default ProsopoCaptchaClient
