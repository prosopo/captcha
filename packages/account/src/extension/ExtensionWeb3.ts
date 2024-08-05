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
import type { Account, ProcaptchaClientConfigOutput } from '@prosopo/types'
import { Extension } from './Extension.js'
import type { InjectedExtension } from '@polkadot/extension-inject/types'
import { ProsopoError } from '@prosopo/common'
import { web3Enable } from '@polkadot/extension-dapp'

/**
 * Class for interfacing with web3 accounts.
 */
export class ExtensionWeb3 extends Extension {
    public async getAccount(config: ProcaptchaClientConfigOutput): Promise<Account> {
        const { dappName, userAccountAddress: address } = config

        if (!address) {
            throw new ProsopoError('WIDGET.NO_ACCOUNTS_FOUND', { context: { error: 'No account address provided' } })
        }

        // enable access to all extensions
        const extensions: InjectedExtension[] = await web3Enable(dappName)
        if (extensions.length === 0) {
            throw new ProsopoError('WIDGET.NO_EXTENSION_FOUND')
        }

        // search through all extensions for the one that has the account
        for (const extension of extensions) {
            const accounts = await extension.accounts.get()
            const account = accounts.find((account) => account.address === address)
            if (account) {
                return { account, extension }
            }
        }

        throw new ProsopoError('WIDGET.ACCOUNT_NOT_FOUND', {
            context: { error: `No account found matching ${address}` },
        })
    }
}
