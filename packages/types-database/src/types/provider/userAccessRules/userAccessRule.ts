import { Schema, type Document } from "mongoose";
import {
	type UserAccessRuleConfig,
	userAccessRuleConfigRecordSchema,
} from "./userAccessRuleConfig.js";
import { type UserIp, userIpRecordSchema } from "./userIp/userIp.js";

interface UserAccessRule extends Document {
	isUserBlocked: boolean;
	description?: string;
	userIp?: UserIp;
	userId?: string;
	clientId?: string;
	config?: UserAccessRuleConfig;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	isUserBlocked: { type: Boolean, required: true },
	description: { type: String, required: false, default: null },
	userIp: {
		type: userIpRecordSchema,
		default: null,
		required: [
			function () {
				const isUserIdUnset = "string" !== typeof this.userId;

				return isUserIdUnset;
			},
			"userIp is required when userId is not set",
		],
	},
	userId: {
		type: String,
		default: null,
		required: [
			function () {
				const isUserIpUnset =
					"object" !== typeof this.userIp || null === this.userIp;

				return isUserIpUnset;
			},
			"userId is required when userIp is not set",
		],
	},
	clientId: { type: String, required: false, default: null },
	config: {
		type: userAccessRuleConfigRecordSchema,
		required: false,
		default: null,
	},
});

export { type UserAccessRule, userAccessRuleSchema };
