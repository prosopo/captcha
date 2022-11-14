export class NoExtensionsFoundError extends Error {
    constructor(msg?: string) {
        super(msg || 'No extensions found')
    }
}

export class AccountCreationUnsupportedError extends Error {
    constructor(msg?: string) {
        super(msg || 'Account creation is not supported')
    }
}

export class NoAccountFoundError extends Error {
    constructor(msg?: string) {
        super(msg || 'No account found')
    }
}