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
import {SignerResult} from '@polkadot/api/types';
import type {SignOptions} from '@polkadot/keyring/types';
import {ISubmittableResult, SignerPayloadJSON, SignerPayloadRaw} from '@polkadot/types/types';
import {AccountSigner} from './accountsigner';
// import type {KeyringPair as PolkadotKeyringPair} from '@polkadot/keyring/types';
import {LocalKeyringPair, Signer as SignerInterface} from '../types/signer';
import { H256 } from '@polkadot/types/interfaces';
// import type { Signer as PolkadotSigner } from '@polkadot/api/types';

/**
 * A wrapper for Keyringpair
 */
export class Signer implements SignerInterface {
    /**
     *
     * @param pair An instantiation of keyringpair
     * @param accountSigner
     */
    constructor(public pair: LocalKeyringPair, public readonly accountSigner: AccountSigner) {}

    addPair: (pair: LocalKeyringPair) => void;
    signRaw?: ((raw: SignerPayloadRaw) => Promise<SignerResult>) | undefined;
    update?: ((id: number, status: H256 | ISubmittableResult) => void) | undefined;

    /**
     * @description The Account address
     */
    get address() {
        return this.pair.address;
    }

    /**
     * @description The Account address
     */
    get addressRaw() {
        return this.pair.addressRaw;
    }

    /**
     * @description Public key of account
     */
    get publicKey() {
        return this.pair.publicKey;
    }

    /**
     * @description Public key of account
     */
    public sign(data: Uint8Array, options?: SignOptions): Uint8Array {
        return this.pair.sign(data, options);
    }

    /**
     * Returns the signature of the transaction
     *
     * @param payload - The data to be signed
     * @returns The signature of the transaction
     *
     */
    public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
        return this.accountSigner.signPayload(payload);
    }

    /**
     * Get account address asynchronously
     *
     * @returns Account address
     *
     */
    public async getAddress(): Promise<string> {
        return Promise.resolve(this.pair.address);
    }

    public setKeyPair(pair: LocalKeyringPair) {
        this.pair = pair;
    }
}
