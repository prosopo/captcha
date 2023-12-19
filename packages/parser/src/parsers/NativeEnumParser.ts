import { BaseParser, ParseOptions } from "./Parser.js"

export type NativeEnum = {
    [key: string]: number | string
}

export class NativeEnumParser<T extends NativeEnum> extends BaseParser<T> {
    constructor(private nativeEnum: T) {
        super()
    }

    parseShape(value: unknown, options?: ParseOptions): T {
        // check runtime type
        if (!this.options.includes(value as T)) {
            throw new Error(`Expected enum value to be one of ${this.options.join(', ')} but got ${value}`)
        }
        return value as T
    }

    get options(): Readonly<T[]> {
        const result = [] as T[]
        // enums are laid out like this:
        // {
        //   '0': 'Red',
        //   '1': 'Green',
        //   '2': 'Blue',
        //   Red: 0,
        //   Green: 1,
        //   Blue: 2
        // }
        // to allow for reverse lookup. All of the keys map to numeric values
        for (const key in this.nativeEnum) {
            if (typeof this.nativeEnum[key] === 'number') {
                result.push(key as unknown as T)
            }
        }
        return result
    }

    get enum() {
        const result = {} as {
            [K in keyof T]: K
        }
        for (const key in this.nativeEnum) {
            if (typeof key === 'string') {
                result[key] = key
            }
        }
        return result
    }
}
