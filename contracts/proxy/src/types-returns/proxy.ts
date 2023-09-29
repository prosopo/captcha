import type { ReturnNumber } from '@727-ventures/typechain-types'

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
}

export enum LangError {
    couldNotReadInput = 'CouldNotReadInput',
}

export interface ProxyMessages {
    getGitCommitId?: null
    getAdmin?: null
    getDestination?: null
    proxyWithdraw?: ReturnNumber
    proxyTerminate?: null
    proxySetCodeHash?: Array<number>
}

export class ProxyMessagesBuilder {
    static GetGitCommitId(): ProxyMessages {
        return {
            getGitCommitId: null,
        }
    }
    static GetAdmin(): ProxyMessages {
        return {
            getAdmin: null,
        }
    }
    static GetDestination(): ProxyMessages {
        return {
            getDestination: null,
        }
    }
    static ProxyWithdraw(value: ReturnNumber): ProxyMessages {
        return {
            proxyWithdraw: value,
        }
    }
    static ProxyTerminate(): ProxyMessages {
        return {
            proxyTerminate: null,
        }
    }
    static ProxySetCodeHash(value: Array<number>): ProxyMessages {
        return {
            proxySetCodeHash: value,
        }
    }
}

export interface ProxyReturnTypes {
    u8X32?: Array<number>
    u8X20?: Array<number>
    accountId?: AccountId
    void?: null
}

export class ProxyReturnTypesBuilder {
    static U8x32(value: Array<number>): ProxyReturnTypes {
        return {
            u8X32: value,
        }
    }
    static U8x20(value: Array<number>): ProxyReturnTypes {
        return {
            u8X20: value,
        }
    }
    static AccountId(value: AccountId): ProxyReturnTypes {
        return {
            accountId: value,
        }
    }
    static Void(): ProxyReturnTypes {
        return {
            void: null,
        }
    }
}

export type AccountId = string | number[]
