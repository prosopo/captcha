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
export const ERRORS = {
    GENERAL: {
        CANNOT_FIND_CONFIG_FILE: {
            message: 'prosopo.config.js / prosopo.config.ts cannot be found.'
        },
        JSON_LOAD_FAILED: {
            message: 'Failed to load JSON file'
        },
        CREATE_JSON_FILE_FAILED: {
            message: 'Failed to create JSON file'
        },
        ASSERT_ERROR: {
            message: 'AssertionError'
        },
        GENERATE_CPATCHAS_JSON_FAILED: {
            message: 'Something went wrong while creating captchas json file'
        },
        CALCULATE_CAPTCHA_SOLUTION: {
            message: 'Something went wrong while calculating captcha solutions'
        },
        MNEMONIC_UNDEFINED : {
            message: 'Provider mnemonic Undefined. Please set `PROVIDER_MNEMONIC` in environment variables'
        }
    },
    CONFIG: {
        UNKNOWN_ENVIRONMENT: {
            message: 'Unknown environment requested'
        },
        INVALID_CAPTCHA_NUMBER: {
            message: 'Please configure captchas configurations correctly'
        },
        CONFIGURATIONS_LOAD_FAILED: {
            message: 'Prosopo configurations load failed'
        }
    },
    DATABASE: {
        CONNECT_ERROR: {
            message: 'Failed to connect'
        },
        DATABASE_IMPORT_FAILED: {
            message: 'Failed to import database engine'
        },
        DATABASE_UNDEFINED: {
            message: 'Database client is not connected'
        },
        COLLECTION_UNDEFINED: {
            message: 'Database collection is not available'
        },
        DATASET_LOAD_FAILED: {
            message: 'Data set load failed'
        },
        DATASET_GET_FAILED: {
            message: 'Failed to get dataset'
        },
        CAPTCHA_GET_FAILED: {
            message: 'Failed to get captcha'
        },
        NO_CAPTCHAS_FOUND: {
            message: 'No captcha matching datasetId'
        },
        PENDING_RECORD_NOT_FOUND: {
            message: 'No pending record found'
        },
        INVALID_HASH: {
            message: 'Invalid hash'
        },
        SOLUTION_GET_FAILED: {
            message: 'Failed to get solution'
        },
        DATASET_WITH_SOLUTIONS_GET_FAILED: {
            message: 'No datasets found with required number of solutions'
        }
    },
    API: {
        BODY_UNDEFINED: {
            message: 'Body must be defined in API POST call'
        },
        PARAMETER_UNDEFINED: {
            message: 'Parameters must be defined in API POST call'
        },
        CAPTCHA_FAILED: {
            message: 'You answered one or more captchas incorrectly. Please try again'
        },
        CAPTCHA_PENDING: {
            message: 'Captcha solutions submitted and awaiting approval'
        },
        CAPTCHA_PASSED: {
            message: 'You correctly answered the captchas'
        },
        BAD_REQUEST: {
            message: 'BadRequest'
        },
        PAYMENT_INFO_NOT_FOUND: {
            message: 'Payment info not found for given block and transaction hashes'
        }
    },
    CONTRACT: {
        INVALID_METHOD: {
            message: 'Invalid contract method'
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
        }
    },
    CLI: {
        PARAMETER_ERROR: {
            message: 'Invalid parameter'
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
        }
    }
}

export class GeneralError extends Error {
    constructor (message) {
        super()
        this.message = message
    }

    getCode () {
        if (this instanceof BadRequest) {
            return 400
        }
        if (this instanceof NotFound) {
            return 404
        }
        return 500
    }
}

export class BadRequest extends GeneralError {
}

export class NotFound extends GeneralError {
}

export const handleErrors = (err, req, res, next) => {
    if (err instanceof GeneralError) {
        return res.status(err.getCode()).json({
            status: 'error',
            message: err.message
        })
    }

    return res.status(500).json({
        status: 'error',
        message: err.message
    })
}
