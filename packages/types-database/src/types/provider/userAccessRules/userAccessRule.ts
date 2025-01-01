import { Schema, type Document } from "mongoose";
import {
	type UserAccessRuleConfig,
	userAccessRuleConfigRecordSchema,
} from "./userAccessRuleConfig.js";
import { type UserIp, userIpRecordSchema } from "./userIp/userIp.js";

interface UserAccessRule {
	isUserBlocked: boolean;
	clientId?: string;
	description?: string;
	userIp?: UserIp;
	userId?: string;
	config?: UserAccessRuleConfig;
}

interface UserAccessRuleRecord extends UserAccessRule {
	_id: string;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	isUserBlocked: { type: Boolean, required: true },
	clientId: { type: String, required: false },
	description: { type: String, required: false },
	userIp: {
		type: userIpRecordSchema,
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
		required: [
			function () {
				const isUserIpUnset =
					"object" !== typeof this.userIp || null === this.userIp;

				return isUserIpUnset;
			},
			"userId is required when userIp is not set",
		],
	},
	config: {
		type: userAccessRuleConfigRecordSchema,
		required: false,
	},
});

export { type UserAccessRule, type UserAccessRuleRecord, userAccessRuleSchema };
