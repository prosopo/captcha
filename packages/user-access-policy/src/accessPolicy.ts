import { z } from "zod";
import type { UserAttributes } from "./userAttributes.js";

export const accessPolicySchema = z.object({
	isUserBlocked: z.boolean().optional(),
	solvedImagesCount: z.number().optional(),
	unsolvedImagesCount: z.number().optional(),
	frictionlessScore: z.number().optional(),
});

export type AccessPolicy = z.infer<typeof accessPolicySchema>;

export type resolveAccessPolicy = (
	userAttributes: UserAttributes,
	clientId: string,
) => Promise<AccessPolicy | undefined>;
