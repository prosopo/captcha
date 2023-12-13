import type { ReturnNumber } from '@prosopo/typechain-types'

export type Hash = string | number[]

export type AccountId = string | number[]

export enum Error {
    notAuthorised = 'NotAuthorised',
    transferFailed = 'TransferFailed',
    setCodeHashFailed = 'SetCodeHashFailed',
    invalidDestination = 'InvalidDestination',
    unknownMessage = 'UnknownMessage',
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
    commitAlreadyExists = 'CommitAlreadyExists',
    notAuthor = 'NotAuthor',
    math = 'Math',
}

export enum LangError {
    couldNotReadInput = 'CouldNotReadInput',
}

export enum Payee {
    provider = 'Provider',
    dapp = 'Dapp',
}

export enum DappPayee {
    provider = 'Provider',
    dapp = 'Dapp',
    any = 'Any',
}

export enum GovernanceStatus {
    active = 'Active',
    inactive = 'Inactive',
}

export type Provider = {
    status: GovernanceStatus
    balance: ReturnNumber
    fee: number
    payee: Payee
    url: Array<number>
    datasetId: Hash
    datasetIdContent: Hash
}

export type Dapp = {
    status: GovernanceStatus
    balance: ReturnNumber
    owner: AccountId
    payee: DappPayee
}

export type UserHistorySummary = {
    correct: number
    incorrect: number
    score: number
}

export type Commit = {
    id: Hash
    userAccount: AccountId
    datasetId: Hash
    status: CaptchaStatus
    dappContract: AccountId
    providerAccount: AccountId
    requestedAt: number
    completedAt: number
    userSignature: Array<number>
}

export enum CaptchaStatus {
    pending = 'Pending',
    approved = 'Approved',
    disapproved = 'Disapproved',
}

export type LastCorrectCaptcha = {
    before: number
    dappContract: AccountId
}

export type User = {
    history: Array<Hash>
}

export type RandomProvider = {
    providerAccount: AccountId
    provider: Provider
    blockNumber: number
}
