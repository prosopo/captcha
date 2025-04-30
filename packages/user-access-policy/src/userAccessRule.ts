import { z } from "zod";

export const userAccessRuleSchema = z.object({
	isBlocked: z.boolean().optional(),
	solvedImagesCount: z.number().optional(),
	unsolvedImagesCount: z.number().optional(),
	frictionlessScore: z.number().optional(),
});

export type UserAccessRule = z.infer<typeof userAccessRuleSchema>;
