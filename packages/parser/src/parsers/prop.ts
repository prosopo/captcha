import { Parser } from "./Parser.js";

export type PropOptions = {
    optional: boolean
    readonly: boolean
}

export interface Prop<T extends PropOptions> {
    readonly propOptions: T
}

export type IsOptional<T> = T extends Prop<infer U> ? U["optional"] extends true ? true : false : never
export type IsReadonly<T> = T extends Prop<infer U> ? U["readonly"] extends true ? true : false : false

export type ExtendPropOptions<T extends PropOptions, U extends Partial<PropOptions>> = {
    // U takes precedence over T
    optional: U["optional"] extends true ? true : T["optional"]
    readonly: U["readonly"] extends true ? true : T["readonly"]
} & PropOptions