export const contractDefinitions = {
    Status: {
        _enum: [
            'Active',
            'Suspended',
            'Deactivated',
            'Pending',
            'Approved',
            'Disapproved'
        ]
    },
    DappAccounts: 'Vec<AccountId>',
    Dapp: {
        // eslint-disable-next-line sort-keys
        status: 'Status',
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
    Provider: {
        status: 'Status',
        balance: 'Balance',
        fee: 'u32',
        payee: 'Payee',
        service_origin: 'Hash',
        captcha_dataset_id: 'Hash',
    },
    ProviderMap: '{"AccountId":"Provider"}',
}
