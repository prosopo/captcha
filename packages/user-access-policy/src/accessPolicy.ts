import { z } from "zod";

export const accessPolicySchema = z.object({
	isUserBlocked: z.boolean().optional(),
	solvedImagesCount: z.number().optional(),
	unsolvedImagesCount: z.number().optional(),
	frictionlessScore: z.number().optional(),
});

export type AccessPolicy = z.infer<typeof accessPolicySchema>;
