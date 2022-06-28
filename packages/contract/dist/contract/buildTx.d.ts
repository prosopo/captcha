import type { SignerOptions } from '@polkadot/api/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import type { Registry } from '@polkadot/types/types';
import { TransactionResponse } from '../types/contract';
export declare function buildTx(registry: Registry, extrinsic: SubmittableExtrinsic<'promise'>, signer: string, options?: Partial<SignerOptions>): Promise<TransactionResponse>;
//# sourceMappingURL=buildTx.d.ts.map