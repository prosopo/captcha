import { Schema, type Document } from "mongoose";
import {
	type UserAccessRuleConfig,
	userAccessRuleConfigRecordSchema,
} from "./userAccessRuleConfig.js";
import { type UserIp, userIpRecordSchema } from "./userIp/userIp.js";

interface UserAccessRule extends Document {
	userIp: UserIp;
	isUserBlocked: boolean;
	clientAccountId?: string;
	config?: UserAccessRuleConfig;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	userIp: { type: userIpRecordSchema, required: true },
	isUserBlocked: { type: Boolean, required: true },
	clientAccountId: { type: String, required: false, default: null },
	config: {
		type: userAccessRuleConfigRecordSchema,
		required: false,
		default: null,
	},
});

export { type UserAccessRule, userAccessRuleSchema };
