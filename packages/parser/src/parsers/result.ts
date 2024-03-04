
/**
 * Hold a result of an operation which either succeeded or failed.
 */
export class Result<T, U = Error> {
    private constructor(private value: T, private error: U | undefined) {
        
    }

    public static ok<T>(value: T) {
        return new Result<T>(value, undefined)
    }

    public static error<T, U>(error: U) {
        return new Result<T, U>(undefined!, error)
    }

    public ok(): boolean {
        return this.error === undefined
    }

    public unwrap(): T {
        if (this.error !== undefined) {
            throw this.error
        }
        return this.value
    }

    public unwrapError(): U {
        if (this.error === undefined) {
            throw new Error('Result is ok')
        }
        return this.error
    }

    public unwrapOr(defaultValue: T): T {
        return this.error === undefined ? this.value : defaultValue
    }

    public unwrapErrorOr(defaultError: U): U {
        return this.error === undefined ? defaultError : this.error
    }

    public unwrapOrElse(fn: () => T): T {
        return this.error === undefined ? this.value : fn()
    }

    public unwrapOrError(fn: () => U): T {
        if (this.error !== undefined) {
            return this.value
        }
        throw fn()
    }

    public unwrapErrorOrElse(fn: () => U): U {
        return this.error === undefined ? fn() : this.error
    }

    public toString(): string {
        return this.error === undefined ? `Ok(${this.value})` : `Error(${this.error})`
    }
}

/**
 * Execute a function that may throw an error and catch the error, returning it as a Result object.
 * @param fn the function to be executed
 * @returns a Result object containing the result of the function. If the function throws an error, the error is caught and returned in the Result object.
 */
export const failible = <T>(fn: () => T): Result<T> => {
    try {
        return Result.ok(fn());
    } catch (e) {
        return Result.error(toError(e));
    }
}

/**
 * Convert an unknown error to an Error type. This is useful for converting errors from catch blocks to a known type.
 * @param error the error to be converted. This should come from a catch block, ergo type is unknown
 */
export const toError = (error: unknown): Error => {
    // if instance of error, cast to error
    if (error instanceof Error) {
        return error
    }
    // else assume the error is the message and create a new error
    return new Error(String(error))
}