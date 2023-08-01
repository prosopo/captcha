// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = z.object({
    data: z.string(),
})

export type Args = z.infer<typeof argsSchema>
