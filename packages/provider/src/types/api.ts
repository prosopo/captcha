import { MongoClient } from "mongodb";

export type Hash = string;

export type Captcha = {
    captchas: [{
        captchaId: string,
        captchaData: [File],
        merkleTreePath: [Hash]
    }],
    datasetId: string,
    captchaProviderId: string
}

export type CaptchaSolution = {
    captchas: [{
        captchaId: string,
        solution: [number],
        salt: string
    }]
}

export type CaptchaSolutionResponse = {
    captchas: [{
        captchaId: string,
        solved: boolean,
        merkleTreeProof: [Hash]
    }],
    datasetId: string,
    captchaProviderId: string
}

export type Status = {
    _enum: [
        'Active',
        'Suspended',
        'Deactivated',
        'Pending',
        'Approved',
        'Disapproved'
    ]
}
export type Dapp = {
    // eslint-disable-next-line sort-keys
    status: 'Status',
    balance: 'Balance',
    owner: 'AccountId',
    min_difficulty: 'u16',
    client_origin: 'Hash',
}

export type CaptchaProvider = {
    // eslint-disable-next-line sort-keys
    status: 'Status',
    staked: 'Balance',
    fee: 'u32',
    service_origin: 'Hash',
    captcha_data_id: 'u64',
}

export type ProsopoError = {
    _enum: [
        'NotAuthorised',
        'InsufficientBalance',
        'InsufficientAllowance',
        'CaptchaProviderExists',
        'CaptchaProviderDoesNotExist',
        'CaptchaProviderInsufficientFunds',
        'CaptchaProviderInactive',
        'DuplicateCaptchaDataId',
        'DappExists',
        'DappDoesNotExist',
        'DappInactive',
        'DappInsufficientFunds',
        'CaptchaDataDoesNotExist',
        'CaptchaSolutionCommitmentDoesNotExist',
        'DappUserDoesNotExist',]
}

export interface Prosopo {
    datasetGet(db: MongoClient): Promise<Hash>;
    captchaGet(db: MongoClient, userId: string, dappId: string): Promise<Captcha>;
    captchaSolution(db: MongoClient, userId: string, dappId: string, captchaSolution: CaptchaSolution): Promise<CaptchaSolutionResponse>
}