import type { Signer as PolkadotSigner } from '@polkadot/api/types';
import { SignerResult } from '@polkadot/api/types';
import Keyring from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry } from '@polkadot/types/types';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
export declare class AccountSigner implements PolkadotSigner {
    #private;
    constructor();
    get keyring(): Keyring;
    init: (registry: Registry, config: string[]) => void;
    findKeyringPair: (address: string) => KeyringPair;
    signRaw: (raw: SignerPayloadRaw) => Promise<SignerResult>;
    signPayload: (payload: SignerPayloadJSON) => Promise<SignerResult>;
    setUp: () => void;
    getPairs: () => KeyringPair[];
    addPair: (pair: KeyringPair) => KeyringPair;
}
//# sourceMappingURL=accountsigner.d.ts.map