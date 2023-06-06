import type BN from 'bn.js';
import type {ReturnNumber} from '@727-ventures/typechain-types';

export type AccountId = string | number[]

export type Hash = string | number[]

export enum LangError {
	couldNotReadInput = 'CouldNotReadInput'
}

export enum Error {
	notAuthorised = 'NotAuthorised',
	contractTransferFailed = 'ContractTransferFailed',
	providerExists = 'ProviderExists',
	providerDoesNotExist = 'ProviderDoesNotExist',
	providerInsufficientFunds = 'ProviderInsufficientFunds',
	providerInactive = 'ProviderInactive',
	providerUrlUsed = 'ProviderUrlUsed',
	dappExists = 'DappExists',
	dappDoesNotExist = 'DappDoesNotExist',
	dappInactive = 'DappInactive',
	dappInsufficientFunds = 'DappInsufficientFunds',
	captchaDataDoesNotExist = 'CaptchaDataDoesNotExist',
	commitDoesNotExist = 'CommitDoesNotExist',
	dappUserDoesNotExist = 'DappUserDoesNotExist',
	noActiveProviders = 'NoActiveProviders',
	datasetIdSolutionsSame = 'DatasetIdSolutionsSame',
	codeNotFound = 'CodeNotFound',
	unknown = 'Unknown',
	invalidContract = 'InvalidContract',
	invalidPayee = 'InvalidPayee',
	invalidCaptchaStatus = 'InvalidCaptchaStatus',
	noCorrectCaptcha = 'NoCorrectCaptcha',
	notEnoughActiveProviders = 'NotEnoughActiveProviders',
	providerFeeTooHigh = 'ProviderFeeTooHigh',
	commitAlreadyExists = 'CommitAlreadyExists',
	captchaSolutionCommitmentAlreadyExists = 'CaptchaSolutionCommitmentAlreadyExists',
	verifyFailed = 'VerifyFailed'
}

export enum Payee {
	provider = 'Provider',
	dapp = 'Dapp'
}

export enum DappPayee {
	provider = 'Provider',
	dapp = 'Dapp',
	any = 'Any'
}

export enum GovernanceStatus {
	active = 'Active',
	inactive = 'Inactive'
}

export type Commit = {
	id: Hash,
	user: AccountId,
	datasetId: Hash,
	status: CaptchaStatus,
	dapp: AccountId,
	provider: AccountId,
	requestedAt: number,
	completedAt: number,
	userSignaturePart1: Array<number>,
	userSignaturePart2: Array<number>
}

export enum CaptchaStatus {
	pending = 'Pending',
	approved = 'Approved',
	disapproved = 'Disapproved'
}

export type LastCorrectCaptcha = {
	before: number,
	dappId: AccountId
}

export type CaptchaData = {
	provider: AccountId,
	datasetId: Hash,
	datasetIdContent: Hash
}

export type User = {
	history: Array<Hash>
}

export type Provider = {
	status: GovernanceStatus,
	balance: ReturnNumber,
	fee: number,
	payee: Payee,
	url: Array<number>,
	datasetId: Hash,
	datasetIdContent: Hash
}

export type Dapp = {
	status: GovernanceStatus,
	balance: ReturnNumber,
	owner: AccountId,
	payee: DappPayee
}

export type RandomProvider = {
	providerId: AccountId,
	provider: Provider,
	blockNumber: number,
	datasetIdContent: Hash
}

