// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = z.object({
    map: z.string(),
    out: z.string(),
    overwrite: z.boolean().optional(),
    size: z.number().optional(),
})

export type Args = z.infer<typeof argsSchema>
