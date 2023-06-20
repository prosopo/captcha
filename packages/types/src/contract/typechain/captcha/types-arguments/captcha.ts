import type BN from 'bn.js';

export type Hash = string | number[]

export type AccountId = string | number[]

export enum LangError {
	couldNotReadInput = 'CouldNotReadInput'
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

export enum Error {
	notAdmin = 'NotAdmin',
	notOwner = 'NotOwner',
	contractTransferFailed = 'ContractTransferFailed',
	providerAccountExists = 'ProviderAccountExists',
	providerExists = 'ProviderExists',
	providerAccountDoesNotExist = 'ProviderAccountDoesNotExist',
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
	commitAlreadyExists = 'CommitAlreadyExists'
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

export type UserHistorySummary = {
	correct: (number | string | BN),
	incorrect: (number | string | BN),
	score: (number | string | BN)
}

export type Commit = {
	id: Hash,
	userAccount: AccountId,
	datasetId: Hash,
	status: CaptchaStatus,
	dappContract: AccountId,
	providerAccount: AccountId,
	requestedAt: (number | string | BN),
	completedAt: (number | string | BN),
	userSignaturePart1: Array<(number | string | BN)>,
	userSignaturePart2: Array<(number | string | BN)>
}

export enum CaptchaStatus {
	pending = 'Pending',
	approved = 'Approved',
	disapproved = 'Disapproved'
}

export type LastCorrectCaptcha = {
	before: (number | string | BN),
	dappContract: AccountId
}

export type CaptchaData = {
	providerAccount: AccountId,
	datasetId: Hash,
	datasetIdContent: Hash
}

export type User = {
	history: Array<Hash>
}

export type RandomProvider = {
	providerAccount: AccountId,
	provider: Provider,
	blockNumber: (number | string | BN)
}

