// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = z.object({
    labels: z.string().optional(),
    out: z.string(),
    labelled: z.string().optional(),
    unlabelled: z.string().optional(),
    seed: z.number().optional(),
    size: z.number().optional(),
    overwrite: z.boolean().optional(),
    allowDuplicates: z.boolean().optional(),
    allowDuplicatesLabelled: z.boolean().optional(),
    allowDuplicatesUnlabelled: z.boolean().optional(),
})

export type Args = z.infer<typeof argsSchema>
