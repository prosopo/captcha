// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = z.object({
    data: z.string(),
    output: z.string(),
    overwrite: z.boolean().optional(),
})

export type Args = z.infer<typeof argsSchema>
