import { z } from "zod";
import { userAttributesSchema } from "./userAttributes.js";

export const accessPolicySchema = z.object({
	isUserBlocked: z.boolean().optional(),
	solvedImagesCount: z.number().optional(),
	unsolvedImagesCount: z.number().optional(),
	frictionlessScore: z.number().optional(),
});

export type AccessPolicy = z.infer<typeof accessPolicySchema>;

export const accessPolicyScope = z.object({
	clientId: z.string().optional(),
	userAttributes: userAttributesSchema.optional(),
});

export type AccessPolicyScope = z.infer<typeof accessPolicyScope>;
