// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = z.object({
    data: z.string(),
    out: z.string(),
    overwrite: z.boolean().optional(),
    size: z.number(),
    square: z.boolean().optional(),
})

export type Args = z.infer<typeof argsSchema>
