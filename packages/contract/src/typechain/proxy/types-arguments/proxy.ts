import type BN from 'bn.js';

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

