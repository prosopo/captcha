export const contractDefinitions = {
    GovernanceStatus: {
        _enum: [
            'Active',
            'Suspended',
            'Deactivated',
        ]
    },
    CaptchaStatus: {
        _enum: [
            'Pending',
            'Approved',
            'Disapproved'
        ]
    },
    DappAccounts: 'Vec<AccountId>',
    ProsopoDapp: {
        // eslint-disable-next-line sort-keys
        status: 'GovernanceStatus',
        balance: 'Balance',
        owner: 'AccountId',
        min_difficulty: 'u16',
        client_origin: 'Hash',
    },
    ProsopoError: {
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
    },
    Payee: {
        _enum: [
            'Provider',
            'Dapp',
            'None',
        ]
    },
    User: {
        correct_captchas: 'u64',
        incorrect_captchas: 'u64',
    },
    ProviderAccounts: 'Vec<AccountId>',
    ProsopoProvider: {
        status: 'GovernanceStatus',
        balance: 'Balance',
        fee: 'u32',
        payee: 'Payee',
        service_origin: 'Hash',
        captcha_dataset_id: 'Hash',
    },
    ProviderMap: '{"AccountId":"Provider"}',
    ProsopoCaptchaData: {
        provider: 'AccountId',
        merkle_tree_root: 'Hash',
        captcha_type: 'u16',
    },
    ProsopoCaptchaSolutionCommitment: {
        account: 'AccountId',
        captcha_dataset_id: 'Hash',
        status: 'CaptchaStatus',
        contract: 'AccountId',
        provider: 'AccountId',
    },
    CaptchaData : {
        provider: 'AccountId',
        merkle_tree_root: 'Hash',
        captcha_type: 'u16',
    }
};