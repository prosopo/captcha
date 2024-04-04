import { z } from 'zod'

export const ConfigSchema = z.object({
    a: z.coerce.boolean(),
    b: z.coerce.number(),
    c: z.string(),
})

export type Config = z.infer<typeof ConfigSchema>
