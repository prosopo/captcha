// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import {ApiPromise} from '@polkadot/api';
import {WsProvider} from '@polkadot/rpc-provider/ws';
import Keyring from "@polkadot/keyring";
import {Network, NetworkUserConfig} from '../types/network';
import {AccountSigner} from '../signer/accountsigner';
import {KeyringPair} from "@polkadot/keyring/types";
import { Signer } from '../signer/signer';
import {ProsopoContractError} from "../handlers";
import {ERRORS} from "../errors";

export function createSigner(signer: AccountSigner, pair: KeyringPair) {
    return new Signer(pair, signer);
}

export function addPair(signer: AccountSigner, pair: KeyringPair): KeyringPair {
    return signer.addPair(pair);
}

export async function createNetwork(mnemonic: string, networkConfig: NetworkUserConfig): Promise<Network> {

    const provider = new WsProvider(networkConfig.endpoint);
    const api = await createApi(provider)
    const registry = api.registry;
    const keyring = new Keyring({
        type: 'sr25519'
    });
    await api.isReadyOrError
    const signer = new AccountSigner();

    const pair = keyring.addFromMnemonic(mnemonic);

    const pairs = keyring.getPairs();
    const findKeyringPair = pairs.find((pair) =>
        registry.createType('AccountId', pair.address).eq(pair.address)
    );


    if(networkConfig.accounts)
        signer.init(registry, networkConfig.accounts);
    signer.setUp && signer.setUp();
    await addPair(signer, pair)

    if (!findKeyringPair) {
        throw new ProsopoContractError(ERRORS.CONTRACT.CANNOT_FIND_KEYPAIR.message, pair.address);
    }
    const network = {
        provider: provider,
        api: api,
        registry: registry,
        keyring: keyring,
        keyringPair: pair,
        signer: signer,
        getAddresses: async () => {
            await api.isReady;

            const pairs = signer.getPairs();

            return pairs.map((pair) => {
                return pair.address;
            });
        },
    }
    return network
}

export function createApi(
    provider: WsProvider,
) {
    return new ApiPromise({
        provider,
    });
}
