import { Schema, type Document } from "mongoose";
import {
	type UserAccessConfig,
	userAccessConfigSchema,
} from "./userAccessConfig.js";
import { type UserIp, userIpRecordSchema } from "./userIp.js";

interface UserAccessRule extends Document {
	userIp: UserIp;
	isForbidden: boolean;
	clientAccountId?: string;
	config?: UserAccessConfig;
}

const userAccessRuleSchema = new Schema<UserAccessRule>({
	userIp: { type: userIpRecordSchema, required: true },
	isForbidden: { type: Boolean, required: true },
	clientAccountId: { type: String, required: false, default: null },
	config: {
		type: userAccessConfigSchema,
		required: false,
		default: null,
	},
});

// 1. unique constraint when mask is defined
userAccessRuleSchema.index(
	{
		"userIp.numeric": 1,
		"userIp.mask.numeric": 1,
		clientAccountId: 1,
	},
	{
		unique: true,
		partialFilterExpression: {
			"userIp.mask.numeric": { $exists: true },
		},
	},
);

// 2. unique constraint when mask is null
userAccessRuleSchema.index(
	{
		"userIp.numeric": 1,
		clientAccountId: 1,
	},
	{
		unique: true,
		partialFilterExpression: {
			"userIp.mask.numeric": { $exists: false },
		},
	},
);

// 3. for "userIp.numeric=x" query part
userAccessRuleSchema.index({
	"userIp.numeric": 1,
});

// 4. for "givenIp >= userIp.mask.rangeMin and givenIp <= userIp.mask.rangeMax" query part
userAccessRuleSchema.index(
	{
		"userIp.mask.rangeMin": 1,
		"userIp.mask.rangeMax": 1,
	},
	{
		partialFilterExpression: {
			"userIp.mask.rangeMin": { $exists: true },
			"userIp.mask.rangeMax": { $exists: true },
		},
	},
);

// 5. for "clientAccount is given" query part
userAccessRuleSchema.index(
	{
		clientAccountId: 1,
	},
	{
		partialFilterExpression: {
			clientAccountId: { $exists: true },
		},
	},
);

export { type UserAccessRule, userAccessRuleSchema };
