import { Schema, type Document } from "mongoose";
import {
	type UserAccessConfig,
	userAccessConfigSchema,
} from "./userAccessConfig.js";
import { type UserIp, userIpRecordSchema } from "./ip/userIp.js";
import { uniqueIndexes } from "./dbIndexes/unique/uniqueIndexes.js";
import { performanceIndexes } from "./dbIndexes/performance/performanceIndexes.js";

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

uniqueIndexes.setup(userAccessRuleSchema);
performanceIndexes.setup(userAccessRuleSchema);

export { type UserAccessRule, userAccessRuleSchema };
