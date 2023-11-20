import type BN from 'bn.js';
import type {ReturnNumber} from '@prosopo/typechain-types';

export enum LangError {
	couldNotReadInput = 'CouldNotReadInput'
}

export type AccountId = string | number[]

