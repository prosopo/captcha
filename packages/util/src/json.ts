

export const jsonEncode = (obj: unknown): string => {
    return JSON.stringify(obj, (_key, value) =>
        typeof value === "bigint" ? {
            type: "bigint",
            value: value.toString()
        } : value
    );
}

export const jsonDecode = (str: string): unknown => {
    return JSON.parse(str, (_key, value) =>
        typeof value === "object" && value !== null && value.type === "bigint" ? BigInt(value.value) : value
    );
}