import { Schema, type Document } from "mongoose";
import {
	type UserAccessConfig,
	userAccessConfigSchema,
} from "./userAccessConfig.js";
import { type UserIp, userIpRecordSchema } from "./ip/userIp.js";
import { ruleRestrictionIndexes } from "./ruleRestrictionIndexes.js";
import { rulePerformanceIndexes } from "./rulePerformanceIndexes.js";

interface UserAccessRule extends Document {
	userIp: UserIp;
	isUserBlocked: boolean;
	clientAccountId?: string;
	config?: UserAccessConfig;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	userIp: { type: userIpRecordSchema, required: true },
	isUserBlocked: { type: Boolean, required: true },
	clientAccountId: { type: String, required: false, default: null },
	config: {
		type: userAccessConfigSchema,
		required: false,
		default: null,
	},
});

ruleRestrictionIndexes.setup(userAccessRuleSchema);
rulePerformanceIndexes.setup(userAccessRuleSchema);

export { type UserAccessRule, userAccessRuleSchema };
