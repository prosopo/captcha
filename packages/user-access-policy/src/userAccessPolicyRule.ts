import { z } from "zod";
import { userAccessRuleSchema } from "./userAccessRule.js";
import { userAttributesSchema } from "./userAttributes.js";

const userPolicyRuleSchema = userAccessRuleSchema
	.merge(userAttributesSchema)
	.merge(
		z.object({
			clientId: z.string().optional(),
			ipRangeMin: z.number().optional(),
			ipRangeMax: z.number().optional(),
		}),
	);

export type UserAccessPolicyRule = z.infer<typeof userPolicyRuleSchema>;
