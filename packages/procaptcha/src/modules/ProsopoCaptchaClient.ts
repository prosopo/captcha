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
    public manager: ICaptchaContextReducer
    public status: ICaptchaStatusReducer
    public callbacks: CaptchaEventCallbacks | undefined
    public providerApi: ProviderApi | undefined
    public provider: ProsopoRandomProviderResponse | undefined
    public providerUrl: string | undefined

    private static extension: IExtensionInterface
    private static contract: ProsopoContract | undefined
    private static captchaApi: ProsopoCaptchaApi | undefined

    constructor(manager: ICaptchaContextReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager
        this.status = status
        this.callbacks = callbacks
    }

    public getProviderApi(providerUrl: string) {
        return new ProviderApi(
            this.manager.state.config.networks[this.manager.state.config.defaultEnvironment],
            providerUrl
        )
    }

    public getExtension() {
        return ProsopoCaptchaClient.extension
    }

    public setExtension(extension: IExtensionInterface) {
        ProsopoCaptchaClient.extension = extension
    }

    public getContract() {
        return ProsopoCaptchaClient.contract
    }

    public getProvider() {
        return this.provider
    }

    public getCaptchaApi() {
        return ProsopoCaptchaClient.captchaApi
    }

    public async onLoad(createAccount?: boolean) {
        console.log('Captcha client onLoad, createAccount:', createAccount)
        if (!ProsopoCaptchaClient.extension) {
            try {
                ProsopoCaptchaClient.extension = await getExtension(
                    getWsProvider(this.manager.state.config['dappUrl']),
                    this.manager.state.config['web2'],
                    this.manager.state.config['accountCreator'],
                    this.manager.state.config['dappName']
                )
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }
        console.log('Extension loaded')
        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, this.manager.state.config['prosopoContractAccount'])
            this.manager.update({ contractAddress: this.manager.state.config['prosopoContractAccount'] })
        }

        let account: TExtensionAccount | undefined
        if (createAccount) {
            console.log('creating account')
            try {
                console.log(this.getExtension())
                account = await this.getExtension().createAccount()
                console.log(account)
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        } else {
            try {
                account = await this.getExtension().getAccount()
            } catch (err) {
                throw new ProsopoEnvError(err)
            }
        }

        if (account) {
            await this.onAccountChange(account)
        }
    }

    public async onAccountChange(account?: TExtensionAccount) {
        if (!account) {
            this.onAccountUnset()
            return
        }

        try {
            ProsopoCaptchaClient.extension.setAccount(account.address)
        } catch (err) {
            throw new ProsopoEnvError(err)
        }

        ProsopoCaptchaClient.contract = await this.initContract(account)

        const isHuman = await ProsopoCaptchaClient.contract.dappOperatorIsHumanUser(
            this.manager.state.config['solutionThreshold']
        )

        // We don't need to show CAPTCHA challenges if the user is determined as human by the contract
        if (isHuman && this.callbacks?.onSolved) {
            await this.callbacks?.onSolved(account, undefined, undefined)
        }

        // Check if there is a provider in local storage or get a random one from the contract
        const provider = storage.getProvider()
        if (provider) {
            this.provider = provider
        } else {
            this.provider = await ProsopoCaptchaClient.contract.getRandomProvider()
            storage.setProvider(this.provider)
        }

        if (!this.provider) {
            throw new ProsopoEnvError('DEVELOPER.PROVIDER_NOT_FOUND')
        }

        this.providerUrl = ProsopoCaptchaClient.trimProviderUrl(this.provider.provider)

        this.providerApi = this.getProviderApi(this.providerUrl)

        const verifyDappUserResponse = await this.providerApi.verifyDappUser(account.address, undefined)

        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi(
            account.address,
            ProsopoCaptchaClient.contract,
            this.provider,
            this.providerApi,
            this.manager.state.config['web2']
        )

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account)
        }

        this.manager.update({ account, providerUrl: this.providerUrl })

        if (this.callbacks?.onSolved && verifyDappUserResponse.solutionApproved) {
            this.callbacks?.onSolved(account, undefined, verifyDappUserResponse)
        }
    }

    public onAccountUnset() {
        ProsopoCaptchaClient.contract = undefined
        this.provider = undefined
        ProsopoCaptchaClient.captchaApi = undefined

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
