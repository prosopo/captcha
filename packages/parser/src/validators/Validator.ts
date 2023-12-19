
// A validator is a class that can be used to validate a value. 
export interface Validator<T> {
    // Validate a value and throw an error if it is invalid
    validate(value: T): void
    // Check whether a value is valid
    isValid(value: T): boolean
}

// The base validator class. This is the class that all other validators inherit from.
export abstract class BaseValidator<T> implements Validator<T> {
    isValid(value: T): boolean {
        try {
            this.validate(value)
            return true
        } catch {
            return false
        }
    }

    abstract validate(value: T): void
}