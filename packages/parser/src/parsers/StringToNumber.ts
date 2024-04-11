import { Validator } from "./Parser.js"


export class StringToNumber extends Validator<string, number> {
    constructor() {
        super()
    }

    public override validate(value: string): number {
        return Number(value)
    }

    public override clone() {
        return new StringToNumber()
    }

    public override get name(): string {
        return `stringToNumber`
    }
}

export const pStringToNumber = () => new StringToNumber()
export const stringToNumber = pStringToNumber
export const str2num = pStringToNumber