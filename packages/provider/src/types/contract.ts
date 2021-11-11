const definitions = {
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
    Dapp: {
        // eslint-disable-next-line sort-keys
        status: 'Status',
        balance: 'Balance',
        owner: 'AccountId',
        min_difficulty: 'u16',
        client_origin: 'Hash',
    },
    CaptchaProvider: {
        // eslint-disable-next-line sort-keys
        status: 'Status',
        staked: 'Balance',
        fee: 'u32',
        service_origin: 'Hash',
        captcha_data_id: 'u64',
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
    }

}

export default definitions;