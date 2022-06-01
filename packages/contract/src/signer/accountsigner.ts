import type { Signer as PolkadotSigner } from '@polkadot/api/types';
import { SignerResult } from '@polkadot/api/types';
import Keyring from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry } from '@polkadot/types/types';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { u8aToHex } from '@polkadot/util';
import {NetworkAccountsUserConfig, LocalKeyringPair} from "../types/signer";

let id = 0; // TODO static id?

export class AccountSigner implements PolkadotSigner {
    readonly #keyring: Keyring;
    #config: NetworkAccountsUserConfig = [];
    #registry!: Registry;

    constructor() {
        this.#keyring = new Keyring({
            type: 'sr25519'
        });
    }

    get keyring(): Keyring {
        return this.#keyring;
    }

    init = (registry: Registry, config: string[]) => {
        this.#registry = registry;
        this.#config = config;
    };

    public findKeyringPair = (address: string) => {
        const pairs = this.#keyring.getPairs();

        const findKeyringPair = pairs.find((pair) =>
            this.#registry.createType('AccountId', pair.address).eq(address)
        );
        if (!findKeyringPair) {
            throw new Error(`Can't find the keyringpair for ${address}`);
        }

        return findKeyringPair;
    };

    public signRaw = async (raw: SignerPayloadRaw): Promise<SignerResult> => {
        return new Promise((resolve): void => {
            const signed = this.findKeyringPair(raw.address).sign(raw.data);

            resolve({ id: ++id, signature: u8aToHex(signed) });
        });
    };

    public signPayload = async (
        payload: SignerPayloadJSON
    ): Promise<SignerResult> => {
        const pair = this.findKeyringPair(payload.address);
        return new Promise((resolve): void => {
            const signed = this.#registry
                .createType('ExtrinsicPayload', payload, { version: payload.version })
                .sign(pair);

            resolve({ id: ++id, ...signed });
        });
    };

    public setUp = () => {
        for (const account of this.#config) {
            let pair: KeyringPair;

            try {
                const meta = {
                    name: account.replace('//', '_').toLowerCase()
                };

                pair = this.keyring.addFromUri(account, meta);
                (pair as LocalKeyringPair).suri = account;

                pair.lock = (): void => {
                };
            } catch (error: any) {
                console.log(error.message);
                throw new Error(`ERRORS.GENERAL.BAD_SURI.message: {uri: ${account}}`);
            }
        }
    };

    public getPairs = () => {
        return this.keyring.getPairs();
    };

    public addPair = (pair: KeyringPair): KeyringPair => {
        return this.keyring.addPair(pair);
    };
}
