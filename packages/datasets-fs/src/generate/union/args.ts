import { argsSchema as parentSchema } from '../args.js'
// Args for generating a dataset

import { z } from 'zod'

export const argsSchema = parentSchema.extend({
    minCorrect: z.number().optional(),
    minIncorrect: z.number().optional(),
    minLabelled: z.number().optional(),
    maxLabelled: z.number().optional(),
    count: z.number().optional(),
})

export type Args = z.infer<typeof argsSchema>
