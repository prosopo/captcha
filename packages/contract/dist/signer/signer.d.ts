import { SignerResult } from '@polkadot/api/types';
import type { SignOptions } from '@polkadot/keyring/types';
import { ISubmittableResult, SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { AccountSigner } from './accountsigner';
import { LocalKeyringPair, Signer as SignerInterface } from '../types/signer';
import { H256 } from '@polkadot/types/interfaces';
/**
 * A wrapper for Keyringpair
 */
export declare class Signer implements SignerInterface {
    pair: LocalKeyringPair;
    readonly accountSigner: AccountSigner;
    /**
     *
     * @param pair An instantiation of keyringpair
     * @param accountSigner
     */
    constructor(pair: LocalKeyringPair, accountSigner: AccountSigner);
    addPair: (pair: LocalKeyringPair) => void;
    signRaw?: ((raw: SignerPayloadRaw) => Promise<SignerResult>) | undefined;
    update?: ((id: number, status: H256 | ISubmittableResult) => void) | undefined;
    /**
     * @description The Account address
     */
    get address(): string;
    /**
     * @description The Account address
     */
    get addressRaw(): Uint8Array;
    /**
     * @description Public key of account
     */
    get publicKey(): Uint8Array;
    /**
     * @description Public key of account
     */
    sign(data: Uint8Array, options?: SignOptions): Uint8Array;
    /**
     * Returns the signature of the transaction
     *
     * @param payload - The data to be signed
     * @returns The signature of the transaction
     *
     */
    signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
    /**
     * Get account address asynchronously
     *
     * @returns Account address
     *
     */
    getAddress(): Promise<string>;
    setKeyPair(pair: LocalKeyringPair): void;
}
//# sourceMappingURL=signer.d.ts.map