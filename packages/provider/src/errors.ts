export const ERRORS = {
    GENERAL: {
        CANNOT_FIND_CONFIG_FILE: {
            message: 'prosopo.config.js / prosopo.config.ts cannot be found.',
        },
        JSON_LOAD_FAILED: {
            message: 'Failed to load JSON file'
        },
        ASSERT_ERROR: {
            message: 'AssertionError'
        }
    },
    CONFIG: {
        UNKNOWN_ENVIRONMENT: {
            message: 'Unknown environment requested'
        }
    },
    DATABASE: {
        DATABASE_IMPORT_FAILED: {
            message: 'Failed to import database engine',
        },
        DATABASE_UNDEFINED: {
            message: 'Database client is not connected',
        },
        COLLECTION_UNDEFINED: {
            message: 'Database collection is not available',
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
        NO_CAPTCHAS_FOUND : {
            message: 'No captcha matching datasetId'
        }
    },
    API: {
        BODY_UNDEFINED: {
            message: 'Body must be defined in API POST call'
        },
        PARAMETER_UNDEFINED: {
            message: 'Parameters must be defined in API POST call'
        },

    },
    CONTRACT: {
        INVALID_METHOD: {
            message: 'Invalid contract method'
        },
        TX_ERROR: {
            message: 'Error making tx'
        },
        INVALID_ADDRESS: {
            message: 'Failed to encode invalid address'
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
        }
    }
}

export class GeneralError extends Error {
    constructor(message) {
        super();
        this.message = message;
    }

    getCode() {
        if (this instanceof BadRequest) {
            return 400;
        }
        if (this instanceof NotFound) {
            return 404;
        }
        return 500;
    }
}

export class BadRequest extends GeneralError {
}

export class NotFound extends GeneralError {
}
