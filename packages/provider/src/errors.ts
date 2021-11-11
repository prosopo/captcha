export const ERRORS = {
    GENERAL: {
        CANNOT_FIND_CONFIG_FILE: {
            number: 1,
            message: 'prosopo.config.js / prosopo.config.ts cannot be found.',
        },
        CANNOT_LOAD_JSON_SECRETS_FILE: {
            number: 2,
            message: 'cannot load JSON secrets file'
        }
    },
    DATABASE: {
        DATABASE_UNDEFINED: {
            number: 1,
            message: 'Database client is not connected',
        }
    },
    API: {
        BODY_UNDEFINED: {
            number: 1,
            message: 'Body must be defined in API POST call'
        },
        PARAMETER_UNDEFINED: {
            number: 2,
            message: 'Parameters must be defined in API POST call'
        },
        TX_ERROR: {
            number: 3,
            message: 'Error making tx'
        }
    }
}
