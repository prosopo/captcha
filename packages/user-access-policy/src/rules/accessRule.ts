import { z } from "zod";
import { accessPolicySchema } from "#policy/accessPolicy.js";
import { userAttributesSchema } from "#policy/userAttributes.js";

export const accessRuleSchema = z
	.object({
		clientId: z.string().optional(),
		ipRangeMin: z.number().optional(),
		ipRangeMax: z.number().optional(),
	})
	.merge(accessPolicySchema)
	.merge(userAttributesSchema);

export type AccessRule = z.infer<typeof accessRuleSchema>;
