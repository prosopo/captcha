export declare const ERRORS: {
    GENERAL: {
        CANNOT_FIND_CONFIG_FILE: {
            message: string;
        };
        JSON_LOAD_FAILED: {
            message: string;
        };
        ASSERT_ERROR: {
            message: string;
        };
    };
    CONFIG: {
        UNKNOWN_ENVIRONMENT: {
            message: string;
        };
        INVALID_CAPTCHA_NUMBER: {
            message: string;
        };
        CONFIGURATIONS_LOAD_FAILED: {
            message: string;
        };
    };
    DATABASE: {
        CONNECT_ERROR: {
            message: string;
        };
        DATABASE_IMPORT_FAILED: {
            message: string;
        };
        DATABASE_UNDEFINED: {
            message: string;
        };
        COLLECTION_UNDEFINED: {
            message: string;
        };
        DATASET_LOAD_FAILED: {
            message: string;
        };
        DATASET_GET_FAILED: {
            message: string;
        };
        CAPTCHA_GET_FAILED: {
            message: string;
        };
        NO_CAPTCHAS_FOUND: {
            message: string;
        };
        PENDING_RECORD_NOT_FOUND: {
            message: string;
        };
        INVALID_HASH: {
            message: string;
        };
    };
    API: {
        BODY_UNDEFINED: {
            message: string;
        };
        PARAMETER_UNDEFINED: {
            message: string;
        };
        CAPTCHA_FAILED: {
            message: string;
        };
        CAPTCHA_PASSED: {
            message: string;
        };
        BAD_REQUEST: {
            message: string;
        };
    };
    CONTRACT: {
        INVALID_METHOD: {
            message: string;
        };
        TX_ERROR: {
            message: string;
        };
        QUERY_ERROR: {
            message: string;
        };
        INVALID_ADDRESS: {
            message: string;
        };
        INVALID_STORAGE_NAME: {
            message: string;
        };
        CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: {
            message: string;
        };
        DAPP_NOT_ACTIVE: {
            message: string;
        };
        CONTRACT_UNDEFINED: {
            message: string;
        };
        SIGNER_UNDEFINED: {
            message: string;
        };
    };
    CLI: {
        PARAMETER_ERROR: {
            message: string;
        };
    };
    DATASET: {
        PARSE_ERROR: {
            message: string;
        };
        HASH_ERROR: {
            message: string;
        };
        INVALID_DATASET_ID: {
            message: string;
        };
    };
    CAPTCHA: {
        PARSE_ERROR: {
            message: string;
        };
        INVALID_CAPTCHA_ID: {
            message: string;
        };
    };
};
export declare class GeneralError extends Error {
    constructor(message: any);
    getCode(): 400 | 404 | 500;
}
export declare class BadRequest extends GeneralError {
}
export declare class NotFound extends GeneralError {
}
export declare const handleErrors: (err: any, req: any, res: any, next: any) => any;
