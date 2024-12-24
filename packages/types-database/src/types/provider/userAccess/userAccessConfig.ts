import { Schema } from "mongoose";
import {
	type ImageCaptchaAccessRule,
	imageCaptchaAccessRuleSchema,
} from "./imageCaptchaAccessRule.js";

interface UserAccessConfig {
	imageCaptcha?: ImageCaptchaAccessRule;
}

const userAccessConfigSchema = new Schema<UserAccessConfig>(
	{
		imageCaptcha: {
			type: imageCaptchaAccessRuleSchema,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type UserAccessConfig, userAccessConfigSchema };
