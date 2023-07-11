import { argsSchema as parentSchema } from '../args'
// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = parentSchema.extend({
    solved: z.number().optional(),
    unsolved: z.number().optional(),
})

export type Args = z.infer<typeof argsSchema>
