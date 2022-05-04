// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
export const contractDefinitions = {
    GovernanceStatus: {
        _enum: [
            'Active',
            'Suspended',
            'Deactivated'
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
        client_origin: 'Hash'
    },
    ProsopoError: {
        _enum: [
            'NotAuthorised',
            'InsufficientBalance',
            'InsufficientAllowance',
            'ProviderExists',
            'ProviderDoesNotExist',
            'ProviderInsufficientFunds',
            'ProviderInactive',
            'ProviderServiceOriginUsed',
            'DuplicateCaptchaDataId',
            'DappExists',
            'DappDoesNotExist',
            'DappInactive',
            'DappInsufficientFunds',
            'CaptchaDataDoesNotExist',
            'CaptchaSolutionCommitmentDoesNotExist',
            'DappUserDoesNotExist',
            'NoActiveProviders'
        ]
    },
    Payee: {
        _enum: [
            'Provider',
            'Dapp',
            'None'
        ]
    },
    User: {
        correct_captchas: 'u64',
        incorrect_captchas: 'u64'
    },
    ProviderAccounts: 'Vec<AccountId>',
    ProsopoProvider: {
        status: 'GovernanceStatus',
        balance: 'Balance',
        fee: 'u32',
        payee: 'Payee',
        service_origin: 'Hash',
        captcha_dataset_id: 'Hash'
    },
    ProsopoRandomProvider: {
        provider_id: 'AccountId',
        provider: 'ProsopoProvider',
        block_number: 'u32'
    },
    ProviderMap: '{"AccountId":"Provider"}',
    ProsopoCaptchaData: {
        provider: 'AccountId',
        merkle_tree_root: 'Hash',
        captcha_type: 'u16'
    },
    ProsopoCaptchaSolutionCommitment: {
        account: 'AccountId',
        captcha_dataset_id: 'Hash',
        status: 'CaptchaStatus',
        contract: 'AccountId',
        provider: 'AccountId',
        completed_at: 'u64'
    },
    CaptchaData: {
        provider: 'AccountId',
        merkle_tree_root: 'Hash',
        captcha_type: 'u16'
    },
    ProsopoLastCorrectCaptcha: {
        before_ms: 'u32',
        dapp_id: 'AccountId',
    }
}
