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
import { ProsopoRandomProviderResponse } from '../types/api'
import { ProsopoContract } from '../api/ProsopoContract'
import { getProsopoContract, getWsProvider } from './contract'
import { getExtension } from './extension'
import { ProviderApi } from '@prosopo/api'
import { ProsopoCaptchaApi } from './ProsopoCaptchaApi'
import { ProsopoEnvError } from '@prosopo/contract'
import { hexToString } from '@polkadot/util'

export class ProsopoCaptchaClient {
    manager: ICaptchaContextReducer
    status: ICaptchaStatusReducer
    callbacks: CaptchaEventCallbacks | undefined
    providerApi: ProviderApi | undefined

    extension: IExtensionInterface
    contract: ProsopoContract | undefined
    provider: ProsopoRandomProviderResponse | undefined
    captchaApi: ProsopoCaptchaApi | undefined

    constructor(manager: ICaptchaContextReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager
        this.status = status
        this.callbacks = callbacks
    }

    public getProviderApi(providerUrl: string) {
        return new ProviderApi(this.manager.state.config, providerUrl)
    }

    public async onLoad(onHuman, createAccount?: boolean) {
        console.log('Captcha client onLoad, createAccount:', createAccount)
        if (!this.extension) {
            try {
                this.extension = await getExtension(
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
        let isHuman: boolean | undefined

        // Read the contract to see if this account hasn past activity that shows they are human
        if (account) {
            this.contract = await this.initContract(account)
            try {
                isHuman = await this.contract.dappOperatorIsHumanUser(
                    this.manager.state.config['solutionThreshold']
                )
            } catch (err) {
                console.log('Error determining whether user is human')
            }
        }
        // If the user is already human we don't need to show CAPTCHA challenges
        if (isHuman) {
            console.log('onHuman', account)
            await onHuman()
        } else {
            console.log('onAccountChange', account)
            await this.onAccountChange(account)
        }
    }

    public async onAccountChange(account?: TExtensionAccount) {
        if (!account) {
            this.onAccountUnset()
            return
        }

        try {
            this.extension.setAccount(account.address)
        } catch (err) {
            throw new ProsopoEnvError(err)
        }

        this.contract = await this.initContract(account)

        try {
            this.provider = await this.contract.getRandomProvider()
        } catch (err) {
            throw new ProsopoEnvError(err)
        }
        console.log(this.provider)
        const providerUrl = hexToString(this.provider.provider.serviceOrigin).replace(/\0/g, '')

        console.log('providerUrl', providerUrl)

        this.providerApi = this.getProviderApi(providerUrl)

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

        this.manager.update({ account, providerUrl })
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
        try {
            return await getProsopoContract(
                this.manager.state.config['prosopoContractAccount'],
                this.manager.state.config['dappAccount'],
                account,
                getWsProvider(this.manager.state.config['dappUrl'])
            )
        } catch (err) {
            throw new ProsopoEnvError(err)
        }
    }
}

export default ProsopoCaptchaClient
