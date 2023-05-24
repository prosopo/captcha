import type BN from 'bn.js';

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
	requestedAt: (number | string | BN),
	completedAt: (number | string | BN),
	userSignature: Array<(number | string | BN)>
}

export enum CaptchaStatus {
	pending = 'Pending',
	approved = 'Approved',
	disapproved = 'Disapproved'
}

export type LastCorrectCaptcha = {
	before: (number | string | BN),
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
	balance: (string | number | BN),
	fee: (number | string | BN),
	payee: Payee,
	url: Array<(number | string | BN)>,
	datasetId: Hash,
	datasetIdContent: Hash
}

export type Dapp = {
	status: GovernanceStatus,
	balance: (string | number | BN),
	owner: AccountId,
	payee: DappPayee
}

export type RandomProvider = {
	providerId: AccountId,
	provider: Provider,
	blockNumber: (number | string | BN),
	datasetIdContent: Hash
}

