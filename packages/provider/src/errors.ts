export const ERRORS = {
    GENERAL: {
        CANNOT_FIND_CONFIG_FILE: {
            message: 'prosopo.config.js / prosopo.config.ts cannot be found.',
        },
        CANNOT_LOAD_JSON_SECRETS_FILE: {
            message: 'cannot load JSON secrets file'
        }
    },
    DATABASE: {
        DATABASE_UNDEFINED: {
            message: 'Database client is not connected',
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
    TRANSACTION : {
        TX_ERROR: {
            message: 'Error making tx'
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
