// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Enum, Map, Struct, Vec, u128, u16, u32, u64 } from '@polkadot/types-codec'
import type { AccountId, Hash } from '@polkadot/types/interfaces/runtime'

/** @name CaptchaData */
export interface CaptchaData extends Struct {
    readonly provider: AccountId
    readonly datasetId: Hash
    readonly captchaType: u16
}

/** @name CaptchaSolutionCommitment */
export interface CaptchaSolutionCommitment extends Struct {
    readonly account: AccountId
    readonly datasetId: Hash
    readonly status: CaptchaStatus
    readonly contract: AccountId
    readonly provider: AccountId
    readonly completedAt: u64
}

/** @name CaptchaSolutionCommitments */
export interface CaptchaSolutionCommitments extends Map {}

/** @name CaptchaStatus */
export interface CaptchaStatus extends Enum {
    readonly isPending: boolean
    readonly isApproved: boolean
    readonly isDisapproved: boolean
    readonly type: 'Pending' | 'Approved' | 'Disapproved'
}

/** @name Dapp */
export interface Dapp extends Struct {
    readonly status: GovernanceStatus
    readonly balance: u128
    readonly owner: AccountId
    readonly minDifficulty: u16
    readonly clientOrigin: Hash
}

/** @name DappAccounts */
export interface DappAccounts extends Vec<AccountId> {}

/** @name Dapps */
export interface Dapps extends Map {}

/** @name DappUserAccounts */
export interface DappUserAccounts extends Vec<AccountId> {}

/** @name DappUsers */
export interface DappUsers extends Map {}

/** @name GovernanceStatus */
export interface GovernanceStatus extends Enum {
    readonly isActive: boolean
    readonly isSuspended: boolean
    readonly isDeactivated: boolean
    readonly type: 'Active' | 'Suspended' | 'Deactivated'
}

/** @name LastCorrectCaptcha */
export interface LastCorrectCaptcha extends Struct {
    readonly beforeMs: u32
    readonly dappId: AccountId
}

/** @name Operator */
export interface Operator extends Struct {
    readonly status: GovernanceStatus
}

/** @name OperatorAccounts */
export interface OperatorAccounts extends Vec<AccountId> {}

/** @name OperatorFeeCurrency */
export interface OperatorFeeCurrency extends Hash {}

/** @name Operators */
export interface Operators extends Map {}

/** @name OperatorStakeDefault */
export interface OperatorStakeDefault extends u64 {}

/** @name Payee */
export interface Payee extends Enum {
    readonly isProvider: boolean
    readonly isDapp: boolean
    readonly isNone: boolean
    readonly type: 'Provider' | 'Dapp' | 'None'
}

/** @name ProsopoError */
export interface ProsopoError extends Enum {
    readonly isNotAuthorised: boolean
    readonly isContractInsufficientFunds: boolean
    readonly isContractTransferFailed: boolean
    readonly isProviderExists: boolean
    readonly isProviderDoesNotExist: boolean
    readonly isProviderInsufficientFunds: boolean
    readonly isProviderInactive: boolean
    readonly isProviderServiceOriginUsed: boolean
    readonly isDuplicateCaptchaDataId: boolean
    readonly isDappExists: boolean
    readonly isDappDoesNotExist: boolean
    readonly isDappInactive: boolean
    readonly isDappInsufficientFunds: boolean
    readonly isCaptchaDataDoesNotExist: boolean
    readonly isCaptchaSolutionCommitmentDoesNotExist: boolean
    readonly isCaptchaSolutionCommitmentExists: boolean
    readonly isDappUserDoesNotExist: boolean
    readonly isNoActiveProviders: boolean
    readonly isDatasetIdSolutionsSame: boolean
    readonly type:
        | 'NotAuthorised'
        | 'ContractInsufficientFunds'
        | 'ContractTransferFailed'
        | 'ProviderExists'
        | 'ProviderDoesNotExist'
        | 'ProviderInsufficientFunds'
        | 'ProviderInactive'
        | 'ProviderServiceOriginUsed'
        | 'DuplicateCaptchaDataId'
        | 'DappExists'
        | 'DappDoesNotExist'
        | 'DappInactive'
        | 'DappInsufficientFunds'
        | 'CaptchaDataDoesNotExist'
        | 'CaptchaSolutionCommitmentDoesNotExist'
        | 'CaptchaSolutionCommitmentExists'
        | 'DappUserDoesNotExist'
        | 'NoActiveProviders'
        | 'DatasetIdSolutionsSame'
}

/** @name Provider */
export interface Provider extends Struct {
    readonly status: GovernanceStatus
    readonly balance: u128
    readonly fee: u32
    readonly payee: Payee
    readonly serviceOrigin: Hash
    readonly datasetId: Hash
    readonly datasetIdContent: Hash
}

/** @name ProviderAccounts */
export interface ProviderAccounts extends Map {}

/** @name Providers */
export interface Providers extends Map {}

/** @name ProviderStakeDefault */
export interface ProviderStakeDefault extends u128 {}

/** @name RandomProvider */
export interface RandomProvider extends Struct {
    readonly providerId: AccountId
    readonly provider: Provider
    readonly blockNumber: u32
}

/** @name ServiceOrigins */
export interface ServiceOrigins extends Map {}

/** @name User */
export interface User extends Struct {
    readonly correctCaptchas: u64
    readonly incorrectCaptchas: u64
    readonly lastCorrectCaptcha: u64
    readonly lastCorrectCaptchaDappId: AccountId
}

export type PHANTOM_DEFINITIONS = 'definitions'
