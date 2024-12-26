import { Schema } from "mongoose";

interface ImageCaptchaAccessRule {
	solvedCount?: number;
	unsolvedCount?: number;
}

const imageCaptchaAccessRuleSchema = new Schema<ImageCaptchaAccessRule>(
	{
		solvedCount: {
			type: Number,
			required: false,
			default: null,
		},
		unsolvedCount: {
			type: Number,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

export { type ImageCaptchaAccessRule, imageCaptchaAccessRuleSchema };
