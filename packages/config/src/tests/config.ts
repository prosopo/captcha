import { z } from 'zod'

export const ConfigSchema = z.object({
    a: z.boolean(),
    b: z.number(),
    c: z.string(),
})

export type Config = z.infer<typeof ConfigSchema>