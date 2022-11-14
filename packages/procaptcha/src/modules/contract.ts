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
import ProsopoContract from '../api/ProsopoContract'
import { WsProvider } from '@polkadot/rpc-provider'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import { ProviderInterface } from '@polkadot/rpc-provider/types'

export function getWsProvider(url?: string): WsProvider {
    return new WsProvider(url)
}

export async function getProsopoContract(
    contractAddress: string,
    dappAddress: string,
    account: InjectedAccountWithMeta,
    providerInterface?: ProviderInterface
): Promise<ProsopoContract> {
    return await ProsopoContract.create(contractAddress, dappAddress, account, providerInterface ?? getWsProvider())
}

// export async function getWsProvider(url?: string): Promise<WsProvider> {
//     const provider = new WsProvider(url, 0);
//     try {
//         await provider.connect();
//     } catch (err) {
//         throw new ProsopoEnvError(`${err.message} ${url}`);
//     }
//     return provider;
// }

// export async function getProsopoContract(address: string, dappAddress: string, account: InjectedAccountWithMeta, url?: string): Promise<ProsopoContract> {
//     return await ProsopoContract.create(address, dappAddress, account, await getWsProvider(url));
// }
