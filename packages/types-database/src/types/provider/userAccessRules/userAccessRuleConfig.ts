import { Schema } from "mongoose";
import {
	type ImageCaptchaAccessRule,
	imageCaptchaAccessRuleSchema,
} from "./imageCaptchaAccessRule.js";

interface UserAccessRuleConfig {
	imageCaptcha?: ImageCaptchaAccessRule;
}

const userAccessRuleConfigRecordSchema = new Schema<UserAccessRuleConfig>(
	{
		imageCaptcha: {
			type: imageCaptchaAccessRuleSchema,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type UserAccessRuleConfig, userAccessRuleConfigRecordSchema };
