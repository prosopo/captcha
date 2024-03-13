import { literal, number, object, string, union, enum as zEnum, type infer as zInfer } from 'zod'
import { enumMap } from './enumMap.js'
export const NetworkNamesSchema = zEnum(['development', 'rococo', 'shiden'])

export type NetworkNames = zInfer<typeof NetworkNamesSchema>

export const NetworkPairTypeSchema = union([
    literal('sr25519'),
    literal('ed25519'),
    literal('ecdsa'),
    literal('ethereum'),
])
export const NetworkConfigSchema = object({
    endpoint: string().url(),
    contract: object({
        address: string(),
        name: string(),
    }),
    pairType: NetworkPairTypeSchema,
    ss58Format: number().positive().default(42),
})

export type NetworkConfig = zInfer<typeof NetworkConfigSchema>

// Force all enum keys to be present in record: https://github.com/colinhacks/zod/issues/1092.
// Unfortunately there doesn't seem to be a way to force at least one key, but not all keys, to be present. See attempt
// below using refine / transform and reported issue: https://github.com/colinhacks/zod/issues/2528
export const ProsopoNetworksSchema = enumMap(
    NetworkNamesSchema,
    NetworkConfigSchema.required({
        endpoint: true,
        pairType: true,
        ss58Format: true,
    })
)
