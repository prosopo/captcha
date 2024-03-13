import { type ZodEnum, type ZodTypeAny, record } from 'zod'

export const enumMap = <T extends [string, ...string[]], U extends ZodTypeAny>(enumeration: ZodEnum<T>, obj: U) => {
    const validateKeysInEnum = <I>(
        record: Record<string, I>
    ): record is Record<
        (typeof enumeration.enum)[keyof typeof enumeration.enum], // Yes this is ugly
        I
    > => Object.keys(record).every((key) => enumeration.safeParse(key).success)
    return record(obj).refine(validateKeysInEnum)
}
