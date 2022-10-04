// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import {ProsopoEnvError} from "@prosopo/contract";

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
        },

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
        },
        DATASET_ID_UNDEFINED: {
            message: 'dataset id undefined'
        }
    },
    CAPTCHA: {
        PARSE_ERROR: {
            message: 'error parsing captcha'
        },
        INVALID_CAPTCHA_ID: {
            message: 'invalid captcha id'
        },
        INVALID_BLOCK_NO: {
            message: 'invalid block number'
        },
        DIFFERENT_DATASET_IDS: {
            message: 'dataset ids do not match'
        }
    },
    DEVELOPER: {
        DAPP_CONTRACT_ADDRESS_MISSING: { message: 'DAPP_CONTRACT_ADDRESS is not set in .env file.' },
    }
}

export class ApiError extends ProsopoEnvError {
    constructor (err) {
        super(err)
    }

    getCode () {
        if (this instanceof BadRequest) {
            return 500
        }
        if (this instanceof NotFound) {
            return 404
        }
        return 400
    }
}

export class BadRequest extends ApiError {
}

export class NotFound extends ApiError {
}

export const handleErrors = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.getCode()).json({
            message: err.message,
            name: err.name
        })
    }

    return res.status(500).json({
        message: err.message,
        name: err.name
    })
}
