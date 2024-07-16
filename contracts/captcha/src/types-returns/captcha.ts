// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { ReturnNumber } from '@prosopo/typechain-types'

export type Hash = string | number[]

export type AccountId = string | number[]

export type Provider = {
    status: GovernanceStatus
    fee: number
    payee: Payee
    url: Array<number>
    datasetId: Hash
    datasetIdContent: Hash
}

export enum GovernanceStatus {
    active = 'Active',
    inactive = 'Inactive',
}

export enum Payee {
    provider = 'Provider',
    dapp = 'Dapp',
}

export type Dapp = {
    status: GovernanceStatus
    balance: ReturnNumber
    owner: AccountId
    payee: DappPayee
}

export enum DappPayee {
    provider = 'Provider',
    dapp = 'Dapp',
    any = 'Any',
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

export type User = {
    history: Array<Hash>
}

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

export type UserHistorySummary = {
    correct: number
    incorrect: number
    score: number
}

export type LastCorrectCaptcha = {
    before: number
    dappContract: AccountId
}

type FrontendProvider = Omit<Provider, 'url'> & { url: string }

export type RandomProvider = {
    providerAccount: AccountId
    provider: FrontendProvider
    blockNumber: number
}
