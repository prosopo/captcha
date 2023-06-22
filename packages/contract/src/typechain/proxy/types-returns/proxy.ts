import type BN from 'bn.js';
import type {ReturnNumber} from '@727-ventures/typechain-types';

export enum LangError {
	couldNotReadInput = 'CouldNotReadInput'
}

export type AccountId = string | number[]

export enum Error {
	notAuthorised = 'NotAuthorised',
	transferFailed = 'TransferFailed',
	setCodeHashFailed = 'SetCodeHashFailed',
	invalidDestination = 'InvalidDestination'
}

