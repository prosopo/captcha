// import { SubmittableResult } from "@polkadot/api";
import type { SubmittableResultValue } from '@polkadot/api/types';

export type TransactionResponse = SubmittableResultValue & { 
    blockHash?: string,
};
