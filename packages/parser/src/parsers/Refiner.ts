import { Cloneable, removeSuffix, toCamelCase } from "./utils.js"


/**
 * A refiner takes a known type and refines it, or throws an error if it cannot.
 * 
 * Refining a value optionally transforms the value and checks it.
 * 
 * E.g. an email refiner may trim whitespace. This is a transform which always succeeds.
 * E.g. an email refiner may check the string conforms to email address format. This is a validation which may fail.
 * 
 * If the value cannot be refined, an error is thrown.
 */
export abstract class Refiner<T> extends Cloneable<Refiner<T>> {

    constructor() {
        super()
    }

    /**
     * Refine a known type. Refinement validates the value and transforms it if necessary. For example, an email parser may trim whitespace from the email address (a transform) then check the string conforms to email address format (a validation). If the value cannot be refined, an error is thrown.
     * @param value the value to refine
     * @returns the refined value
     */
    public refine(value: T): T {
        // default no-op
        return value
    }

    /**
     * Name of the parser. This is used in generating output types and debugging. E.g. if this parser was an email parser, "email" would be a suitable name. This parser may be part of a more complex parser, such as an object parser. When calling the `name()` fn on the object parser, it would look something like:
     * ```ts
     * {
     *     ...
     *     someField: 'email',
     *     ...
     * }
     * ```
     * which can be useful for debugging and generating output types during runtime.
     * 
     * @returns the name of the parser
     */
    public get name(): string {
        return this.getDefaultName()
    }

    public getDefaultName() {
        const name = this.constructor.name
        const typeName = removeSuffix(name, "Validator")
        const typeNameCamel = toCamelCase(typeName)
        return typeNameCamel
    }
}
