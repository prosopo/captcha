import { enumMap } from './enumMap.js'
import { z } from 'zod'
export const NetworkNamesSchema = z.enum(['development', 'rococo', 'shiden'])

export type NetworkNames = z.infer<typeof NetworkNamesSchema>

export const NetworkPairTypeSchema = z.union([
    z.literal('sr25519'),
    z.literal('ed25519'),
    z.literal('ecdsa'),
    z.literal('ethereum'),
])
export const NetworkConfigSchema = z.object({
    endpoint: z.string().url(),
    contract: z.object({
        address: z.string(),
        name: z.string(),
    }),
    pairType: NetworkPairTypeSchema,
    ss58Format: z.number().positive().default(42),
})

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>

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
