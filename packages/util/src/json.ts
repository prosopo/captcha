

export const jsonEncode = (obj: unknown, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === "bigint" ? {
            type: "bigint",
            value: value.toString()
        } : replacer ? replacer.call(this, key, value) : value
        , space);
}

export const jsonDecode = (str: string, reviver?: (this: any, key: string, value: any) => any): unknown => {
    return JSON.parse(str, (key, value) => {
        if (typeof value === "object" && value !== null && value.type === "bigint") {
            return BigInt(value.value);
        }
        return reviver ? reviver.call(this, key, value) : value;
    });
}