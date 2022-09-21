// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
export const ERRORS = {
    GENERAL: {
        BAD_SURI: {message: 'Bad SURI'}
    },
    CONTRACT: {
        INVALID_METHOD: {
            message: 'Invalid contract method',
        },
        TX_ERROR: {
            message: 'Error making tx'
        },
        QUERY_ERROR: {
            message: 'Error making query'
        },
        INVALID_ADDRESS: {
            message: 'Failed to encode invalid address'
        },
        INVALID_STORAGE_NAME: {
            message: 'Failed to find given storage name'
        },
        CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: {
            message: 'Captcha solution commitment does not exist'
        },
        DAPP_NOT_ACTIVE: {
            message: 'Dapp is not active'
        },
        CONTRACT_UNDEFINED: {
            message: 'Contract undefined'
        },
        SIGNER_UNDEFINED: {
            message: 'Signer undefined'
        },
        SIGNER_NOT_SUPPORTED: {
            message: 'Signer is not supported. Use connect instead, e.g. contract.connect(signer)'
        },
        CANNOT_FIND_KEYPAIR: {
            message: 'Cannot find keypair'
        }
    },
    DATASET: {
        PARSE_ERROR: {
            message: 'error parsing dataset'
        },
        HASH_ERROR: {
            message: 'error hashing dataset'
        },
        INVALID_DATASET_ID: {
            message: 'invalid dataset id'
        }
    },
    CAPTCHA: {
        PARSE_ERROR: {
            message: 'error parsing captcha'
        },
        INVALID_CAPTCHA_ID: {
            message: 'invalid captcha id'
        },
        SOLUTION_HASH_ERROR: {
            message: 'error hashing solution'
        },
        INVALID_ITEM_FORMAT : {
            message: 'only image and text item types allowed'
        },
        ID_MISMATCH: {
            message: 'captcha id mismatch'
        },
        MISSING_ITEM_HASH: {
            message: 'missing item hash'
        },
    }
}
